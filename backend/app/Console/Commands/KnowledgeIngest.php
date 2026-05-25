<?php

namespace App\Console\Commands;

use App\Services\KnowledgeService;
use Illuminate\Console\Command;

class KnowledgeIngest extends Command
{
    protected $signature = 'knowledge:ingest
                            {path? : File or directory path (defaults to /home/ubuntu/laravel13-wechat-hengtai-ai/docs)}
                            {--force : Re-ingest already processed documents}';

    protected $description = 'Ingest documents into the knowledge base (PDF, DOCX, XLSX, TXT)';

    public function handle(KnowledgeService $service): int
    {
        $path = $this->argument('path')
            ?? base_path('../../docs');

        if (! file_exists($path)) {
            $this->error("Path not found: {$path}");

            return self::FAILURE;
        }

        if (is_file($path)) {
            $this->ingestOne($service, $path);
        } else {
            $files = glob(rtrim($path, '/').'/*.{pdf,docx,xlsx,txt,csv}', GLOB_BRACE);
            if (empty($files)) {
                $this->warn('No supported files found in directory.');

                return self::SUCCESS;
            }
            foreach ($files as $file) {
                $this->ingestOne($service, $file);
            }
        }

        $this->info('Done.');

        return self::SUCCESS;
    }

    private function ingestOne(KnowledgeService $service, string $path): void
    {
        $name = basename($path);
        $this->line("Processing: <comment>{$name}</comment>");

        $doc = $service->ingestFile($path);

        if ($doc->status === 'ready') {
            $this->info("  ✓ {$doc->chunk_count} chunks indexed");
        } else {
            $this->error("  ✗ Failed: {$doc->error_message}");
        }
    }
}
