<?php

namespace App\Filament\Resources\Attendees\Tables;

use App\Models\Attendee;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class AttendeesTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('name')
                    ->label('姓名')
                    ->searchable(),
                TextColumn::make('phone')
                    ->label('手机号')
                    ->searchable()
                    ->copyable(),
                TextColumn::make('industry')
                    ->label('行业')
                    ->searchable(),
                TextColumn::make('company')
                    ->label('工作单位')
                    ->searchable()
                    ->toggleable(),
                TextColumn::make('email')
                    ->label('邮箱')
                    ->toggleable(),
                TextColumn::make('group_key')
                    ->label('报名群组')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => match ($state) {
                        'group1' => '开业仪式',
                        'group2' => '保誠',
                        'group3' => '晚餐',
                        default => '未指定',
                    })
                    ->color(fn (?string $state): string => match ($state) {
                        'group1' => 'success',
                        'group2' => 'warning',
                        'group3' => 'info',
                        default => 'gray',
                    })
                    ->sortable(),
                TextColumn::make('source')
                    ->label('来源')
                    ->badge()
                    ->toggleable(),
                TextColumn::make('created_at')
                    ->label('登记时间')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('ip')
                    ->label('IP')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('group_key')
                    ->label('报名群组')
                    ->options([
                        'group1' => '开业仪式',
                        'group2' => '保誠',
                        'group3' => '晚餐',
                    ]),
                SelectFilter::make('industry')
                    ->label('行业')
                    ->options(fn () => Attendee::query()
                        ->whereNotNull('industry')
                        ->distinct()
                        ->orderBy('industry')
                        ->pluck('industry', 'industry')
                        ->all()),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
