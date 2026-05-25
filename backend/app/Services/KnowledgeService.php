<?php

namespace App\Services;

use App\Models\KnowledgeChunk;
use App\Models\KnowledgeDoc;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory as SpreadsheetFactory;
use PhpOffice\PhpWord\IOFactory as WordFactory;
use Smalot\PdfParser\Parser as PdfParser;

class KnowledgeService
{
    private const CHUNK_SIZE = 500;      // characters per chunk

    private const CHUNK_OVERLAP = 80;   // overlap between chunks

    private const TOP_K = 5;            // chunks to retrieve per query

    private const EMBED_DIM = 1536;     // DeepSeek text-embedding-v3

    // -------------------------------------------------------------------------
    // Document ingestion
    // -------------------------------------------------------------------------

    public function ingestFile(string $filePath): KnowledgeDoc
    {
        $filename = basename($filePath);
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        $doc = KnowledgeDoc::updateOrCreate(
            ['file_path' => $filePath],
            [
                'filename' => $filename,
                'title' => pathinfo($filename, PATHINFO_FILENAME),
                'file_type' => $ext,
                'file_size' => filesize($filePath),
                'status' => 'processing',
                'error_message' => null,
            ]
        );

        // Remove old chunks if re-ingesting
        $doc->chunks()->delete();

        try {
            $text = $this->extractText($filePath, $ext);
            $chunks = $this->splitIntoChunks($text);

            foreach ($chunks as $index => $chunk) {
                $embedding = $this->embed($chunk);

                KnowledgeChunk::create([
                    'doc_id' => $doc->id,
                    'chunk_index' => $index,
                    'content' => $chunk,
                    'content_length' => mb_strlen($chunk),
                    'embedding' => $embedding ? $this->formatVector($embedding) : null,
                ]);
            }

            $doc->update(['chunk_count' => count($chunks), 'status' => 'ready']);
        } catch (\Throwable $e) {
            $doc->update(['status' => 'error', 'error_message' => $e->getMessage()]);
            Log::error("Knowledge ingest failed for {$filename}: ".$e->getMessage());
        }

        return $doc->fresh();
    }

    public function ingestDirectory(string $dir): array
    {
        $results = [];
        $files = glob(rtrim($dir, '/').'/*.{pdf,docx,xlsx,txt,csv}', GLOB_BRACE);

        foreach ($files as $file) {
            $results[] = $this->ingestFile($file);
        }

        return $results;
    }

    // -------------------------------------------------------------------------
    // Text extraction
    // -------------------------------------------------------------------------

    private function extractText(string $path, string $ext): string
    {
        return match ($ext) {
            'pdf' => $this->extractPdf($path),
            'docx', 'doc' => $this->extractDocx($path),
            'xlsx', 'xls' => $this->extractXlsx($path),
            default => file_get_contents($path),
        };
    }

    private function extractPdf(string $path): string
    {
        // Try text-based extraction first (fast, free)
        $parser = new PdfParser;
        $text = $parser->parseFile($path)->getText();

        if (mb_strlen(trim($text)) > 50) {
            return $text;
        }

        // Scanned PDF: use Gemini vision AI for high-quality OCR
        return app(GeminiParserService::class)->parsePdf($path);
    }

    private function extractDocx(string $path): string
    {
        $phpWord = WordFactory::load($path);
        $text = '';
        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                if (method_exists($element, 'getText')) {
                    $text .= $element->getText()."\n";
                } elseif (method_exists($element, 'getElements')) {
                    foreach ($element->getElements() as $child) {
                        if (method_exists($child, 'getText')) {
                            $text .= $child->getText();
                        }
                    }
                    $text .= "\n";
                }
            }
        }

        return $text;
    }

    private function extractXlsx(string $path): string
    {
        $spreadsheet = SpreadsheetFactory::load($path);
        $text = '';
        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $text .= "【工作表：{$sheet->getTitle()}】\n";
            foreach ($sheet->toArray() as $row) {
                $cells = array_filter($row, fn ($v) => $v !== null && $v !== '');
                if ($cells) {
                    $text .= implode(' | ', $cells)."\n";
                }
            }
            $text .= "\n";
        }

        return $text;
    }

    // -------------------------------------------------------------------------
    // Chunking
    // -------------------------------------------------------------------------

    private function splitIntoChunks(string $text): array
    {
        $text = preg_replace('/\s+/', ' ', trim($text));
        $len = mb_strlen($text);
        $chunks = [];
        $start = 0;

        while ($start < $len) {
            $chunk = mb_substr($text, $start, self::CHUNK_SIZE);
            if (trim($chunk) !== '') {
                $chunks[] = trim($chunk);
            }
            $start += self::CHUNK_SIZE - self::CHUNK_OVERLAP;
        }

        return $chunks;
    }

    // -------------------------------------------------------------------------
    // Embeddings via DeepSeek API
    // -------------------------------------------------------------------------

    private function embed(string $text): ?array
    {
        $apiKey = config('services.deepseek.api_key');
        $baseUrl = config('services.deepseek.base_url', 'https://api.deepseek.com');

        if (! $apiKey) {
            return null;
        }

        try {
            $response = Http::withToken($apiKey)
                ->timeout(30)
                ->post("{$baseUrl}/embeddings", [
                    'model' => 'text-embedding-v3',
                    'input' => $text,
                ]);

            if ($response->successful()) {
                return $response->json('data.0.embedding');
            }

            // Fallback: try OpenAI-compatible endpoint
            Log::warning('DeepSeek embedding failed: '.$response->body());
        } catch (\Throwable $e) {
            Log::warning('Embedding request error: '.$e->getMessage());
        }

        return null;
    }

    private function formatVector(array $vector): string
    {
        return '['.implode(',', $vector).']';
    }

    // -------------------------------------------------------------------------
    // Retrieval
    // -------------------------------------------------------------------------

    /**
     * Find top-K most relevant chunks for a query.
     * Uses vector cosine similarity when embeddings exist, falls back to trigram.
     */
    public function search(string $query, int $topK = self::TOP_K): string
    {
        $embedding = $this->embed($query);

        if ($embedding) {
            $chunks = $this->vectorSearch($embedding, $topK);
        } else {
            $chunks = $this->keywordSearch($query, $topK);
        }

        if ($chunks->isEmpty()) {
            return '';
        }

        $context = "以下是从知识库中检索到的相关内容，请优先参考这些信息回答用户问题：\n\n";
        foreach ($chunks as $i => $chunk) {
            $context .= '【参考'.(string) ($i + 1).'】'."\n".$chunk->content."\n\n";
        }

        return trim($context);
    }

    private function vectorSearch(array $embedding, int $topK)
    {
        $vec = $this->formatVector($embedding);

        return KnowledgeChunk::whereHas('doc', fn ($q) => $q->where('status', 'ready'))
            ->whereNotNull('embedding')
            ->orderByRaw('embedding <=> ?::vector', [$vec])
            ->limit($topK)
            ->get();
    }

    private function keywordSearch(string $query, int $topK)
    {
        return KnowledgeChunk::whereHas('doc', fn ($q) => $q->where('status', 'ready'))
            ->whereRaw('content % ?', [$query])
            ->orderByRaw('similarity(content, ?) DESC', [$query])
            ->limit($topK)
            ->get();
    }
}
