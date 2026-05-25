<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class DeepSeekService
{
    public function hasApiKey(): bool
    {
        return ! empty(config('services.deepseek.api_key'));
    }

    /**
     * Call DeepSeek's OpenAI-compatible chat completion endpoint.
     *
     * @param  array<int, array{role: string, content: string}>  $messages
     * @param  array{model?: string, max_tokens?: int, temperature?: float}  $opts
     */
    public function chat(array $messages, array $opts = []): string
    {
        if (! $this->hasApiKey()) {
            throw new RuntimeException('DEEPSEEK_API_KEY is not configured.');
        }

        $apiKey = config('services.deepseek.api_key');
        $model = $opts['model'] ?? config('services.deepseek.model', 'deepseek-chat');
        $baseUrl = rtrim(config('services.deepseek.base_url', 'https://api.deepseek.com'), '/');
        $timeout = (int) config('services.deepseek.timeout', 60);

        $payload = [
            'model' => $model,
            'messages' => $messages,
        ];

        if (isset($opts['max_tokens'])) {
            $payload['max_tokens'] = (int) $opts['max_tokens'];
        }

        if (isset($opts['temperature'])) {
            $payload['temperature'] = (float) $opts['temperature'];
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$apiKey,
            'Content-Type' => 'application/json',
        ])->timeout($timeout)->post("{$baseUrl}/chat/completions", $payload);

        if (! $response->successful()) {
            throw new RuntimeException(
                'DeepSeek API error '.$response->status().': '.$response->body()
            );
        }

        return (string) $response->json('choices.0.message.content', '');
    }

    /**
     * Streaming version: invokes $onChunk($delta, $kind) for each text piece ('content' / 'reasoning').
     *
     * Tool-call deltas are NOT forwarded to $onChunk — they're accumulated and returned so the
     * caller can execute tools and decide whether to make another round-trip.
     *
     * @param  array<int, array{role: string, content?: string|null, tool_calls?: array, tool_call_id?: string, name?: string}>  $messages
     * @param  array{model?: string, max_tokens?: int, temperature?: float}  $opts
     * @param  callable(string, string): void  $onChunk
     * @param  array<int, array<string, mixed>>|null  $tools  OpenAI-style tools list (null disables function calling)
     * @return array{finish_reason: ?string, content: string, reasoning_content: string, tool_calls: array<int, array{id: string, type: string, function: array{name: string, arguments: string}}>}
     */
    public function chatStream(array $messages, array $opts, callable $onChunk, ?array $tools = null): array
    {
        if (! $this->hasApiKey()) {
            throw new RuntimeException('DEEPSEEK_API_KEY is not configured.');
        }

        $apiKey = config('services.deepseek.api_key');
        $model = $opts['model'] ?? config('services.deepseek.model', 'deepseek-chat');
        $baseUrl = rtrim(config('services.deepseek.base_url', 'https://api.deepseek.com'), '/');
        $timeout = (int) config('services.deepseek.timeout', 60);

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'stream' => true,
        ];
        if (isset($opts['max_tokens'])) {
            $payload['max_tokens'] = (int) $opts['max_tokens'];
        }
        if (isset($opts['temperature'])) {
            $payload['temperature'] = (float) $opts['temperature'];
        }
        if (! empty($tools)) {
            $payload['tools'] = array_values($tools);
            $payload['tool_choice'] = 'auto';
        }

        $buffer = '';
        $errorBody = '';

        // Accumulators for the return value.
        $accumulatedContent = '';
        $accumulatedReasoning = '';
        $toolCallsByIndex = [];   // index => ['id'=>..., 'type'=>..., 'function'=>['name'=>..., 'arguments'=>...]]
        $finishReason = null;

        $ch = curl_init("{$baseUrl}/chat/completions");
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer '.$apiKey,
                'Content-Type: application/json',
                'Accept: text/event-stream',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_WRITEFUNCTION => function ($curl, $data) use (
                &$buffer,
                &$errorBody,
                &$accumulatedContent,
                &$accumulatedReasoning,
                &$toolCallsByIndex,
                &$finishReason,
                $onChunk,
            ) {
                $httpCode = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
                if ($httpCode !== 0 && $httpCode !== 200) {
                    $errorBody .= $data;

                    return strlen($data);
                }

                $buffer .= $data;
                while (($nlPos = strpos($buffer, "\n")) !== false) {
                    $line = substr($buffer, 0, $nlPos);
                    $buffer = substr($buffer, $nlPos + 1);
                    $line = rtrim($line, "\r");
                    if ($line === '' || str_starts_with($line, ':')) {
                        continue;
                    }
                    if (! str_starts_with($line, 'data:')) {
                        continue;
                    }
                    $payload = trim(substr($line, 5));
                    if ($payload === '' || $payload === '[DONE]') {
                        continue;
                    }
                    $decoded = json_decode($payload, true);
                    if (! is_array($decoded)) {
                        continue;
                    }
                    $choice = $decoded['choices'][0] ?? [];
                    $deltaObj = $choice['delta'] ?? [];

                    if (isset($choice['finish_reason']) && $choice['finish_reason'] !== null) {
                        $finishReason = (string) $choice['finish_reason'];
                    }

                    $content = $deltaObj['content'] ?? null;
                    $reasoning = $deltaObj['reasoning_content'] ?? null;
                    if (is_string($content) && $content !== '') {
                        $accumulatedContent .= $content;
                        $onChunk($content, 'content');
                    }
                    if (is_string($reasoning) && $reasoning !== '') {
                        $accumulatedReasoning .= $reasoning;
                        $onChunk($reasoning, 'reasoning');
                    }

                    $toolCallDeltas = $deltaObj['tool_calls'] ?? null;
                    if (is_array($toolCallDeltas)) {
                        foreach ($toolCallDeltas as $tcd) {
                            $idx = (int) ($tcd['index'] ?? 0);
                            if (! isset($toolCallsByIndex[$idx])) {
                                $toolCallsByIndex[$idx] = [
                                    'id' => '',
                                    'type' => 'function',
                                    'function' => ['name' => '', 'arguments' => ''],
                                ];
                            }
                            if (isset($tcd['id']) && is_string($tcd['id']) && $tcd['id'] !== '') {
                                $toolCallsByIndex[$idx]['id'] = $tcd['id'];
                            }
                            if (isset($tcd['type']) && is_string($tcd['type'])) {
                                $toolCallsByIndex[$idx]['type'] = $tcd['type'];
                            }
                            $fn = $tcd['function'] ?? [];
                            if (isset($fn['name']) && is_string($fn['name']) && $fn['name'] !== '') {
                                $toolCallsByIndex[$idx]['function']['name'] = $fn['name'];
                            }
                            if (isset($fn['arguments']) && is_string($fn['arguments'])) {
                                $toolCallsByIndex[$idx]['function']['arguments'] .= $fn['arguments'];
                            }
                        }
                    }
                }

                return strlen($data);
            },
        ]);

        curl_exec($ch);
        $err = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($err !== '') {
            throw new RuntimeException('DeepSeek stream cURL error: '.$err);
        }
        if ($httpCode !== 200) {
            throw new RuntimeException(
                'DeepSeek API error '.$httpCode.': '.($errorBody !== '' ? $errorBody : 'no body')
            );
        }

        ksort($toolCallsByIndex);

        return [
            'finish_reason' => $finishReason,
            'content' => $accumulatedContent,
            'reasoning_content' => $accumulatedReasoning,
            'tool_calls' => array_values($toolCallsByIndex),
        ];
    }
}
