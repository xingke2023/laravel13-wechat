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
     * Streaming version: invokes $onChunk($delta, $kind) per piece from DeepSeek.
     * $kind is 'content' for the final answer or 'reasoning' for the model's chain-of-thought.
     *
     * @param  array<int, array{role: string, content: string}>  $messages
     * @param  array{model?: string, max_tokens?: int, temperature?: float}  $opts
     * @param  callable(string, string): void  $onChunk
     */
    public function chatStream(array $messages, array $opts, callable $onChunk): void
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

        $buffer = '';
        $errorBody = '';

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
            CURLOPT_WRITEFUNCTION => function ($curl, $data) use (&$buffer, &$errorBody, $onChunk) {
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
                    $deltaObj = $decoded['choices'][0]['delta'] ?? [];
                    $content = $deltaObj['content'] ?? null;
                    $reasoning = $deltaObj['reasoning_content'] ?? null;
                    if (is_string($content) && $content !== '') {
                        $onChunk($content, 'content');
                    }
                    if (is_string($reasoning) && $reasoning !== '') {
                        $onChunk($reasoning, 'reasoning');
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
    }
}
