<?php

namespace App\Filament\Resources\KnowledgeDocs\Pages;

use App\Filament\Resources\KnowledgeDocs\KnowledgeDocResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditKnowledgeDoc extends EditRecord
{
    protected static string $resource = KnowledgeDocResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
