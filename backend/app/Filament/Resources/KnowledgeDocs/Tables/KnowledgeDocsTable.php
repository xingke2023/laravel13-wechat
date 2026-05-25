<?php

namespace App\Filament\Resources\KnowledgeDocs\Tables;

use App\Models\KnowledgeDoc;
use App\Services\KnowledgeService;
use Filament\Actions\Action;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Notifications\Notification;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class KnowledgeDocsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('id')->label('ID')->sortable()->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('filename')->label('文件名')->searchable()->wrap()->limit(50),
                BadgeColumn::make('file_type')
                    ->label('类型')
                    ->colors([
                        'danger' => 'pdf',
                        'primary' => fn ($state) => in_array($state, ['docx', 'doc']),
                        'success' => fn ($state) => in_array($state, ['xlsx', 'xls']),
                        'gray' => fn ($state) => in_array($state, ['txt', 'csv']),
                    ]),
                TextColumn::make('file_size')
                    ->label('大小')
                    ->formatStateUsing(fn ($state) => $state ? round($state / 1024, 1).' KB' : '-')
                    ->sortable(),
                TextColumn::make('chunk_count')->label('分块数')->sortable()->badge()->color('info'),
                BadgeColumn::make('status')
                    ->label('状态')
                    ->colors([
                        'success' => 'ready',
                        'warning' => 'processing',
                        'gray' => 'pending',
                        'danger' => 'error',
                    ])
                    ->formatStateUsing(fn ($state) => match ($state) {
                        'ready' => '已就绪',
                        'processing' => '处理中',
                        'pending' => '待处理',
                        'error' => '失败',
                        default => $state,
                    }),
                TextColumn::make('updated_at')->label('最近更新')->dateTime('Y-m-d H:i')->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('状态')
                    ->options([
                        'ready' => '已就绪',
                        'processing' => '处理中',
                        'pending' => '待处理',
                        'error' => '失败',
                    ]),
                SelectFilter::make('file_type')
                    ->label('类型')
                    ->options([
                        'pdf' => 'PDF',
                        'docx' => 'DOCX',
                        'xlsx' => 'XLSX',
                        'txt' => 'TXT',
                        'csv' => 'CSV',
                    ]),
            ])
            ->recordActions([
                Action::make('reingest')
                    ->label('重新解析')
                    ->icon('heroicon-o-arrow-path')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading('确认重新解析？')
                    ->modalDescription(fn (KnowledgeDoc $record) => "将重新调用 AI 解析「{$record->filename}」并替换现有分块。可能需要 1-2 分钟。")
                    ->action(function (KnowledgeDoc $record) {
                        if (! file_exists($record->file_path)) {
                            Notification::make()
                                ->title('源文件不存在')
                                ->body($record->file_path)
                                ->danger()
                                ->send();

                            return;
                        }
                        $doc = app(KnowledgeService::class)->ingestFile($record->file_path);
                        Notification::make()
                            ->title($doc->status === 'ready' ? '解析成功' : '解析失败')
                            ->body($doc->status === 'ready' ? "已生成 {$doc->chunk_count} 个分块" : $doc->error_message)
                            ->{$doc->status === 'ready' ? 'success' : 'danger'}()
                            ->send();
                    }),
                Action::make('chunks')
                    ->label('查看分块')
                    ->icon('heroicon-o-document-magnifying-glass')
                    ->color('info')
                    ->modalHeading(fn (KnowledgeDoc $record) => "分块预览：{$record->filename}")
                    ->modalContent(fn (KnowledgeDoc $record) => view('filament.knowledge-chunks', [
                        'chunks' => $record->chunks()->orderBy('chunk_index')->get(),
                    ]))
                    ->modalSubmitAction(false)
                    ->modalCancelActionLabel('关闭'),
                DeleteAction::make()->label('删除'),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
