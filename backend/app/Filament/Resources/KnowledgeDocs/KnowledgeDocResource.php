<?php

namespace App\Filament\Resources\KnowledgeDocs;

use App\Filament\Resources\KnowledgeDocs\Pages\CreateKnowledgeDoc;
use App\Filament\Resources\KnowledgeDocs\Pages\EditKnowledgeDoc;
use App\Filament\Resources\KnowledgeDocs\Pages\ListKnowledgeDocs;
use App\Filament\Resources\KnowledgeDocs\Schemas\KnowledgeDocForm;
use App\Filament\Resources\KnowledgeDocs\Tables\KnowledgeDocsTable;
use App\Models\KnowledgeDoc;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class KnowledgeDocResource extends Resource
{
    protected static ?string $model = KnowledgeDoc::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBookOpen;

    protected static ?string $navigationLabel = '公司知识库';

    protected static ?string $modelLabel = '文档';

    protected static ?string $pluralModelLabel = '公司知识库';

    protected static ?string $recordTitleAttribute = 'filename';

    public static function form(Schema $schema): Schema
    {
        return KnowledgeDocForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return KnowledgeDocsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListKnowledgeDocs::route('/'),
            'create' => CreateKnowledgeDoc::route('/create'),
            'edit' => EditKnowledgeDoc::route('/{record}/edit'),
        ];
    }
}
