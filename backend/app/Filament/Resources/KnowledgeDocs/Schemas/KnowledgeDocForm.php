<?php

namespace App\Filament\Resources\KnowledgeDocs\Schemas;

use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Placeholder;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class KnowledgeDocForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                FileUpload::make('upload')
                    ->label('上传文档')
                    ->disk('local')
                    ->directory('knowledge-uploads')
                    ->acceptedFileTypes([
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.ms-excel',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'text/plain',
                        'text/csv',
                    ])
                    ->maxSize(20480)
                    ->helperText('支持 PDF / DOCX / XLSX / TXT / CSV，最大 20 MB。上传后将自动调用 AI 解析。')
                    ->visibleOn('create')
                    ->required(),

                TextInput::make('title')
                    ->label('标题（可选）')
                    ->helperText('如不填写，使用文件名作为标题')
                    ->maxLength(255),

                Placeholder::make('info')
                    ->label('')
                    ->content('上传成功后会自动解析，根据文档大小可能需要 1-2 分钟。'),
            ]);
    }
}
