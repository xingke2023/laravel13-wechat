<?php

namespace App\Filament\Resources\KnowledgeDocs\Pages;

use App\Filament\Resources\KnowledgeDocs\KnowledgeDocResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListKnowledgeDocs extends ListRecords
{
    protected static string $resource = KnowledgeDocResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
