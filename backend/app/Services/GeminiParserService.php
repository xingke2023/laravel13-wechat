<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Uses the Gemini vision API (via OpenAI-compatible proxy) to extract
 * text from scanned PDFs and other image-heavy documents.
 */
class GeminiParserService
{
    private string $apiKey;

    private string $baseUrl;

    private string $model;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key', '');
        $this->baseUrl = rtrim(config('services.gemini.base_url', 'https://tokens.fidelityai.net'), '/');
        $this->model = config('services.gemini.model', 'gemini-3-flash-preview');
    }

    /**
     * Parse a PDF file and return extracted text.
     * Converts each page to an image, then sends to Gemini vision.
     */
    public function parsePdf(string $pdfPath): string
    {
        $tmpDir = sys_get_temp_dir().'/gemini_ocr_'.uniqid();
        mkdir($tmpDir, 0755, true);

        try {
            // Convert PDF to PNG images (200 DPI for good quality)
            $prefix = $tmpDir.'/page';
            exec('pdftoppm -r 200 -png '.escapeshellarg($pdfPath).' '.escapeshellarg($prefix).' 2>&1', $out, $code);

            $images = glob($tmpDir.'/page-*.png') ?: glob($tmpDir.'/page*.png');
            sort($images);

            if (empty($images)) {
                Log::warning("GeminiParser: No pages extracted from {$pdfPath}");

                return '';
            }

            $allText = '';
            foreach ($images as $imgPath) {
                $pageText = $this->extractTextFromImage($imgPath);
                if ($pageText) {
                    $allText .= $pageText."\n\n";
                }
                unlink($imgPath);
            }

            return trim($allText);
        } finally {
            @rmdir($tmpDir);
        }
    }

    /**
     * Parse a single image file and return extracted text.
     */
    public function parseImage(string $imagePath): string
    {
        return $this->extractTextFromImage($imagePath);
    }

    /**
     * Send an image to Gemini vision and extract all text content.
     */
    private function extractTextFromImage(string $imagePath): string
    {
        $imageData = base64_encode(file_get_contents($imagePath));
        $mimeType = mime_content_type($imagePath) ?: 'image/png';

        $prompt = <<<'PROMPT'
请提取这张图片中的所有文字内容。要求：
1. 完整保留所有文字，包括表格、表头、数字、日期、姓名等
2. 保持原有的段落结构和换行
3. 表格内容用竖线"|"分隔列，每行一条记录
4. 不要添加任何解释或额外内容，只输出原始文字
PROMPT;

        try {
            $response = Http::withToken($this->apiKey)
                ->timeout(60)
                ->post("{$this->baseUrl}/v1/chat/completions", [
                    'model' => $this->model,
                    'max_tokens' => 4096,
                    'messages' => [
                        [
                            'role' => 'user',
                            'content' => [
                                [
                                    'type' => 'image_url',
                                    'image_url' => [
                                        'url' => "data:{$mimeType};base64,{$imageData}",
                                    ],
                                ],
                                [
                                    'type' => 'text',
                                    'text' => $prompt,
                                ],
                            ],
                        ],
                    ],
                ]);

            if ($response->successful()) {
                return trim($response->json('choices.0.message.content') ?? '');
            }

            Log::warning('GeminiParser API error: '.$response->status().' '.$response->body());
        } catch (\Throwable $e) {
            Log::error('GeminiParser exception: '.$e->getMessage());
        }

        return '';
    }
}
