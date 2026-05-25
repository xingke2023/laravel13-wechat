<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KnowledgeChunk extends Model
{
    protected $fillable = [
        'doc_id', 'chunk_index', 'content', 'content_length', 'embedding',
    ];

    public function doc(): BelongsTo
    {
        return $this->belongsTo(KnowledgeDoc::class, 'doc_id');
    }
}
