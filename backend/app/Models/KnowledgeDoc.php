<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KnowledgeDoc extends Model
{
    protected $fillable = [
        'filename', 'title', 'file_type', 'file_path',
        'file_size', 'chunk_count', 'status', 'error_message',
    ];

    public function chunks(): HasMany
    {
        return $this->hasMany(KnowledgeChunk::class, 'doc_id');
    }
}
