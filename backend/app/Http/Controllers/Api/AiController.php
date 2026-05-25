<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DeepSeekService;
use App\Services\KnowledgeService;
use App\Services\PolicyQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AiController extends Controller
{
    /** Cap how many times the model can call tools before we force a final answer. */
    private const TOOL_LOOP_MAX_ITERATIONS = 4;

    public function __construct(
        private DeepSeekService $deepseek,
        private KnowledgeService $knowledge,
        private PolicyQueryService $policy,
    ) {}

    private function injectKnowledge(array &$messages, array $data): void
    {
        // Extract the last user message to search the knowledge base
        $userMessages = array_filter($data['messages'], fn ($m) => $m['role'] === 'user');
        $lastUser = end($userMessages);

        if (! $lastUser) {
            return;
        }

        $context = $this->knowledge->search($lastUser['content']);

        if (! $context) {
            return;
        }

        // Prepend knowledge context to the system message
        $systemContent = $context;
        if (! empty($data['system'])) {
            $systemContent = $data['system']."\n\n".$context;
        }

        // Replace or insert system message
        if (isset($messages[0]) && $messages[0]['role'] === 'system') {
            $messages[0]['content'] = $systemContent;
        } else {
            array_unshift($messages, ['role' => 'system', 'content' => $systemContent]);
        }
    }

    public function chat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'messages' => 'required|array|min:1|max:40',
            'messages.*.role' => 'required|string|in:system,user,assistant',
            'messages.*.content' => 'required|string|max:8000',
            'system' => 'nullable|string|max:4000',
            'model' => 'nullable|string|max:64',
            'max_tokens' => 'nullable|integer|min:1|max:4096',
            'temperature' => 'nullable|numeric|min:0|max:2',
        ]);

        $messages = [];
        if (! empty($data['system'])) {
            $messages[] = ['role' => 'system', 'content' => $data['system']];
        }
        foreach ($data['messages'] as $msg) {
            $messages[] = ['role' => $msg['role'], 'content' => $msg['content']];
        }

        $this->injectKnowledge($messages, $data);

        $opts = array_filter([
            'model' => $data['model'] ?? null,
            'max_tokens' => $data['max_tokens'] ?? null,
            'temperature' => $data['temperature'] ?? null,
        ], fn ($v) => $v !== null);

        try {
            $reply = $this->deepseek->chat($messages, $opts);
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => 'AI service unavailable',
                'detail' => $e->getMessage(),
            ], 503);
        }

        return response()->json([
            'reply' => $reply,
            'model' => $opts['model'] ?? config('services.deepseek.model'),
        ]);
    }

    public function chatStream(Request $request): StreamedResponse
    {
        $data = $request->validate([
            'messages' => 'required|array|min:1|max:40',
            'messages.*.role' => 'required|string|in:system,user,assistant',
            'messages.*.content' => 'required|string|max:8000',
            'system' => 'nullable|string|max:4000',
            'model' => 'nullable|string|max:64',
            'max_tokens' => 'nullable|integer|min:1|max:4096',
            'temperature' => 'nullable|numeric|min:0|max:2',
        ]);

        $messages = [];
        if (! empty($data['system'])) {
            $messages[] = ['role' => 'system', 'content' => $data['system']];
        }
        foreach ($data['messages'] as $msg) {
            $messages[] = ['role' => $msg['role'], 'content' => $msg['content']];
        }

        $this->injectKnowledge($messages, $data);

        $opts = array_filter([
            'model' => $data['model'] ?? null,
            'max_tokens' => $data['max_tokens'] ?? null,
            'temperature' => $data['temperature'] ?? null,
        ], fn ($v) => $v !== null);

        // Tools are only available to authenticated users (guest stream uses the same controller method
        // via routes/api.php; we gate via $request->user()).
        $tools = $request->user() !== null ? $this->buildPolicyTools() : null;

        $deepseek = $this->deepseek;
        $policy = $this->policy;
        $maxIters = self::TOOL_LOOP_MAX_ITERATIONS;

        $response = new StreamedResponse(function () use ($deepseek, $policy, $messages, $opts, $tools, $maxIters) {
            while (ob_get_level() > 0) {
                ob_end_flush();
            }
            ignore_user_abort(false);

            $emit = function (array $payload): void {
                echo 'data: '.json_encode($payload, JSON_UNESCAPED_UNICODE)."\n\n";
                @ob_flush();
                flush();
            };

            $onContentChunk = function (string $delta, string $kind) use ($emit) {
                if ($kind === 'reasoning') {
                    $emit(['reasoning' => $delta]);
                } else {
                    $emit(['delta' => $delta]);
                }
            };

            try {
                $iter = 0;
                $convo = $messages;

                while (true) {
                    $iter++;
                    $passTools = ($tools !== null && $iter <= $maxIters) ? $tools : null;

                    $result = $deepseek->chatStream($convo, $opts, $onContentChunk, $passTools);

                    if (empty($result['tool_calls']) || $result['finish_reason'] !== 'tool_calls') {
                        break;
                    }

                    // Append the assistant turn that contained the tool_calls.
                    // DeepSeek reasoning models (deepseek-v4-flash / deepseek-v4-pro) require
                    // reasoning_content to be replayed on subsequent turns.
                    $assistantMsg = [
                        'role' => 'assistant',
                        'content' => $result['content'] !== '' ? $result['content'] : null,
                        'tool_calls' => array_map(fn ($tc) => [
                            'id' => $tc['id'],
                            'type' => $tc['type'] ?? 'function',
                            'function' => [
                                'name' => $tc['function']['name'] ?? '',
                                'arguments' => $tc['function']['arguments'] ?? '',
                            ],
                        ], $result['tool_calls']),
                    ];
                    if (! empty($result['reasoning_content'])) {
                        $assistantMsg['reasoning_content'] = $result['reasoning_content'];
                    }
                    $convo[] = $assistantMsg;

                    foreach ($result['tool_calls'] as $tc) {
                        $name = $tc['function']['name'] ?? '';
                        $rawArgs = $tc['function']['arguments'] ?? '';
                        $args = json_decode($rawArgs, true);
                        if (! is_array($args)) {
                            $args = [];
                        }

                        $emit(['tool' => $name, 'status' => 'executing', 'args' => $args]);

                        $output = $this->executeTool($policy, $name, $args);

                        $emit([
                            'tool' => $name,
                            'status' => isset($output['error']) ? 'error' : 'done',
                        ]);

                        $convo[] = [
                            'role' => 'tool',
                            'tool_call_id' => $tc['id'],
                            'name' => $name,
                            'content' => json_encode($output, JSON_UNESCAPED_UNICODE),
                        ];
                    }
                }

                echo "data: [DONE]\n\n";
                @ob_flush();
                flush();
            } catch (RuntimeException $e) {
                $emit(['error' => $e->getMessage()]);
                echo "data: [DONE]\n\n";
                @ob_flush();
                flush();
            }
        }, 200, [
            'Content-Type' => 'text/event-stream; charset=utf-8',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ]);

        return $response;
    }

    /**
     * Dispatch a model-issued tool call to the right PolicyQueryService method.
     *
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    private function executeTool(PolicyQueryService $policy, string $name, array $args): array
    {
        return match ($name) {
            'lookup_policy_by_number' => $policy->lookupByPolicyNumber((string) ($args['policy_no'] ?? '')),
            'lookup_policies_by_name' => $policy->lookupPoliciesByName((string) ($args['name'] ?? '')),
            'list_policy_numbers' => $policy->listPolicyNumbers(
                isset($args['name']) ? (string) $args['name'] : null,
                isset($args['id_number']) ? (string) $args['id_number'] : null,
            ),
            default => ['error' => "unknown tool: {$name}"],
        };
    }

    /**
     * OpenAI-compatible tool schemas for the cxfortune policy lookup endpoints.
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildPolicyTools(): array
    {
        $sourceNote = '响应包含 source 字段: "133" 是核心业务库(2018-11 后停更, 含完整客户信息和证件号), "esupport" 持续同步至今、是判断当前状态的可靠来源。同一保单号在两边都有时会各返回一条, 请对比解读。';
        $statusNote = '133 系统 policy_status: 6/7=生效, 8=冷静期退保, 9=保费假期, 10=转入, 12=退保, 13=失效, 15=被撤。 Esupport status: 1=生效, 2=处理中, 3=搁置, 4=存档, 5=失效, 6=退保, 11=冷静期退保, 21=转出。';

        return [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'lookup_policy_by_number',
                    'description' => '按保单号查询单张保单的完整详情(含投保人/被保人/受益人、产品、保险公司、保额、保费、状态等)。'.$sourceNote.' '.$statusNote,
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'policy_no' => [
                                'type' => 'string',
                                'description' => '保单号, 如 "503-3919910" 或 "G681331965"。允许大小写,服务端会自动 trim。',
                            ],
                        ],
                        'required' => ['policy_no'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'lookup_policies_by_name',
                    'description' => '按客户姓名(中文/英文均可,模糊匹配)查询其名下所有保单的完整详情。结果可能很多,响应中 count 字段反映实际返回条数,每个来源最多 200 条。'.$sourceNote,
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'name' => [
                                'type' => 'string',
                                'description' => '客户姓名, 中文或英文均可, 模糊匹配(包含即命中)。例如 "林楠" 或 "LIN NAN"。',
                            ],
                        ],
                        'required' => ['name'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'list_policy_numbers',
                    'description' => '只取保单号列表(不带详细信息),适合先批量定位再用 lookup_policy_by_number 取详情。name 和 id_number 至少传一个; id_number 只在 133 系统命中(Esupport 表无证件号字段)。',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'name' => [
                                'type' => 'string',
                                'description' => '客户姓名, 模糊匹配。可选, 但必须与 id_number 至少提供一个。',
                            ],
                            'id_number' => [
                                'type' => 'string',
                                'description' => '证件号 (身份证 / 港澳通行证 / 护照等), 模糊匹配 133 系统的 IDENTITY_NUMBER / IDENTITY_NUMBER2 字段。可选, 但必须与 name 至少提供一个。',
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
