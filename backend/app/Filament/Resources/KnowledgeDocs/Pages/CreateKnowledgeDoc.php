<?php

namespace App\Filament\Resources\KnowledgeDocs\Pages;

use App\Filament\Resources\KnowledgeDocs\KnowledgeDocResource;
use App\Models\KnowledgeDoc;
use App\Services\KnowledgeService;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Storage;

class CreateKnowledgeDoc extends CreateRecord
{
    protected static string $resource = KnowledgeDocResource::class;

    /**
     * Skip the default create() and instead run the file through
     * KnowledgeService which creates/updates the doc record itself.
     */
    protected function handleRecordCreation(array $data): KnowledgeDoc
    {
        $relative = $data['upload'] ?? null;
        if (! $relative) {
            $this->halt();
        }

        $absolutePath = Storage::disk('local')->path($relative);

        if (! file_exists($absolutePath)) {
            Notification::make()->title('文件保存失败')->danger()->send();
            $this->halt();
        }

        // Move to the canonical docs/ directory so re-ingest works later
        $docsDir = base_path('../docs');
        if (! is_dir($docsDir)) {
            mkdir($docsDir, 0755, true);
        }
        $finalPath = $docsDir.'/'.basename($relative);

        // If a file with same name exists, append timestamp
        if (file_exists($finalPath)) {
            $info = pathinfo($finalPath);
            $finalPath = $info['dirname'].'/'.$info['filename'].'_'.time().'.'.$info['extension'];
        }
        rename($absolutePath, $finalPath);

        $doc = app(KnowledgeService::class)->ingestFile($finalPath);

        if (! empty($data['title'])) {
            $doc->update(['title' => $data['title']]);
        }

        Notification::make()
            ->title($doc->status === 'ready' ? '解析成功' : '解析失败')
            ->body($doc->status === 'ready'
                ? "已生成 {$doc->chunk_count} 个分块"
                : $doc->error_message)
            ->{$doc->status === 'ready' ? 'success' : 'danger'}()
            ->send();

        return $doc;
    }
}
