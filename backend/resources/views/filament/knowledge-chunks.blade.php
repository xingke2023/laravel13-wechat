<div style="max-height: 65vh; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">
    @forelse ($chunks as $chunk)
        <div style="border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 12px 14px; background: #fafafa;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 12px; font-weight: 700; color: #1a3a6b; background: rgba(26,58,107,0.08); padding: 2px 8px; border-radius: 999px;">
                    分块 #{{ $chunk->chunk_index + 1 }}
                </span>
                <span style="font-size: 12px; color: #6b7a99;">
                    {{ $chunk->content_length }} 字
                    @if (! is_null($chunk->embedding))
                        · ✓ 已向量化
                    @endif
                </span>
            </div>
            <div style="white-space: pre-wrap; line-height: 1.6; font-size: 13.5px; color: #2A1F19; word-break: break-word;">{{ $chunk->content }}</div>
        </div>
    @empty
        <div style="text-align: center; color: #6b7a99; padding: 32px;">此文档没有任何分块。</div>
    @endforelse
</div>
