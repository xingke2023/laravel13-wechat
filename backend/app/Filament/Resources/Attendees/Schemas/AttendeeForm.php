<?php

namespace App\Filament\Resources\Attendees\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class AttendeeForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->label('姓名')
                    ->required()
                    ->maxLength(50),
                TextInput::make('phone')
                    ->label('手机号')
                    ->tel()
                    ->required()
                    ->maxLength(20),
                TextInput::make('industry')
                    ->label('行业')
                    ->required()
                    ->maxLength(50),
                TextInput::make('email')
                    ->label('邮箱')
                    ->email()
                    ->maxLength(120),
                TextInput::make('source')
                    ->label('登记来源')
                    ->maxLength(32)
                    ->default('web'),
            ]);
    }
}
