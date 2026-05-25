<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PolicyQueryService
{
    public function hasApiKey(): bool
    {
        return ! empty(config('services.cxfortune_policy.api_key'));
    }

    /**
     * GET /policy/{policyNo} — full detail for a single policy number.
     *
     * @return array<string, mixed>
     */
    public function lookupByPolicyNumber(string $policyNo): array
    {
        $policyNo = trim($policyNo);

        if ($policyNo === '') {
            return ['error' => 'policy_no is required'];
        }

        return $this->request('GET', '/policy/'.rawurlencode($policyNo));
    }

    /**
     * GET /policies?name= — full detail for every policy whose customer name matches.
     *
     * @return array<string, mixed>
     */
    public function lookupPoliciesByName(string $name): array
    {
        $name = trim($name);

        if ($name === '') {
            return ['error' => 'name is required'];
        }

        return $this->request('GET', '/policies', ['name' => $name]);
    }

    /**
     * GET /policy-numbers?name=&idNumber= — bare policy-number list (at least one of name / idNumber).
     *
     * @return array<string, mixed>
     */
    public function listPolicyNumbers(?string $name = null, ?string $idNumber = null): array
    {
        $query = array_filter([
            'name' => $name !== null ? trim($name) : null,
            'idNumber' => $idNumber !== null ? trim($idNumber) : null,
        ], fn ($v) => $v !== null && $v !== '');

        if (empty($query)) {
            return ['error' => 'either name or id_number must be provided'];
        }

        return $this->request('GET', '/policy-numbers', $query);
    }

    /**
     * @param  array<string, string>  $query
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, array $query = []): array
    {
        if (! $this->hasApiKey()) {
            return ['error' => 'CXFORTUNE_POLICY_API_KEY is not configured'];
        }

        $baseUrl = rtrim((string) config('services.cxfortune_policy.base_url'), '/');
        $apiKey = (string) config('services.cxfortune_policy.api_key');
        $timeout = (int) config('services.cxfortune_policy.timeout', 20);
        $url = $baseUrl.$path;

        try {
            $request = Http::withHeaders([
                'X-API-Key' => $apiKey,
                'Accept' => 'application/json',
            ])->timeout($timeout);

            $response = match (strtoupper($method)) {
                'GET' => $request->get($url, $query),
                default => $request->send($method, $url, ['query' => $query]),
            };

            if (! $response->successful()) {
                Log::warning('PolicyQuery upstream non-2xx', [
                    'path' => $path,
                    'status' => $response->status(),
                    'body' => mb_substr($response->body(), 0, 500),
                ]);

                return [
                    'error' => 'upstream HTTP '.$response->status(),
                    'detail' => $response->json('error') ?? mb_substr($response->body(), 0, 200),
                ];
            }

            $json = $response->json();

            return is_array($json) ? $json : ['error' => 'invalid JSON response'];
        } catch (\Throwable $e) {
            Log::warning('PolicyQuery request error: '.$e->getMessage(), ['path' => $path]);

            return ['error' => 'request failed', 'detail' => $e->getMessage()];
        }
    }
}
