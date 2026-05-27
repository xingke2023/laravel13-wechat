<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DeepSeekService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AiController extends Controller
{
    public function __construct(private DeepSeekService $deepseek) {}

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

        $opts = array_filter([
            'model' => $data['model'] ?? null,
            'max_tokens' => $data['max_tokens'] ?? null,
            'temperature' => $data['temperature'] ?? null,
        ], fn ($v) => $v !== null);

        $deepseek = $this->deepseek;

        $response = new StreamedResponse(function () use ($deepseek, $messages, $opts) {
            while (ob_get_level() > 0) {
                ob_end_flush();
            }
            ignore_user_abort(false);

            $emit = function (array $payload): void {
                echo 'data: '.json_encode($payload, JSON_UNESCAPED_UNICODE)."\n\n";
                @ob_flush();
                flush();
            };

            try {
                $deepseek->chatStream($messages, $opts, function (string $delta, string $kind) use ($emit) {
                    if ($kind === 'reasoning') {
                        $emit(['reasoning' => $delta]);
                    } else {
                        $emit(['delta' => $delta]);
                    }
                });
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
}
