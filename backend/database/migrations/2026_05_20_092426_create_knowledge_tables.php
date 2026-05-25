<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS vector');
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        Schema::create('knowledge_docs', function (Blueprint $table) {
            $table->id();
            $table->string('filename');
            $table->string('title')->nullable();
            $table->string('file_type', 20);   // pdf, docx, xlsx, txt
            $table->string('file_path');
            $table->unsignedBigInteger('file_size')->default(0);
            $table->unsignedInteger('chunk_count')->default(0);
            $table->string('status', 20)->default('pending'); // pending, processing, ready, error
            $table->text('error_message')->nullable();
            $table->timestamps();
        });

        Schema::create('knowledge_chunks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doc_id')->constrained('knowledge_docs')->cascadeOnDelete();
            $table->unsignedInteger('chunk_index');
            $table->text('content');
            $table->unsignedInteger('content_length')->default(0);
            $table->timestamps();
        });

        // pgvector column (1536 dims = DeepSeek text-embedding-v3 compatible)
        DB::statement('ALTER TABLE knowledge_chunks ADD COLUMN embedding vector(1536)');

        // HNSW index for fast cosine similarity search
        DB::statement('CREATE INDEX knowledge_chunks_embedding_idx ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)');

        // Trigram index for keyword fallback when no embedding available
        DB::statement('CREATE INDEX knowledge_chunks_content_trgm_idx ON knowledge_chunks USING gin (content gin_trgm_ops)');
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_chunks');
        Schema::dropIfExists('knowledge_docs');
    }
};
