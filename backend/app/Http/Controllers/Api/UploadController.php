<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:20480'],
            'kind' => ['nullable', 'string', 'in:image,file,voice'],
        ]);

        $uploaded = $request->file('file');
        $kind = $request->input('kind') ?: $this->inferKind($uploaded->getMimeType());

        $user = $request->user();
        $userSeg = $user ? (string) $user->id : 'guest';
        $monthSeg = now()->format('Ym');
        $ext = strtolower($uploaded->getClientOriginalExtension() ?: $uploaded->guessExtension() ?: 'bin');
        $name = (string) Str::uuid().'.'.$ext;

        $path = "uploads/{$userSeg}/{$monthSeg}/{$name}";
        Storage::disk('public')->putFileAs(
            "uploads/{$userSeg}/{$monthSeg}",
            $uploaded,
            $name
        );

        return response()->json([
            'url'  => Storage::disk('public')->url($path),
            'path' => $path,
            'kind' => $kind,
            'name' => $uploaded->getClientOriginalName() ?: $name,
            'size' => $uploaded->getSize(),
            'mime' => $uploaded->getMimeType(),
        ]);
    }

    private function inferKind(?string $mime): string
    {
        if (! $mime) {
            return 'file';
        }
        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }
        if (str_starts_with($mime, 'audio/')) {
            return 'voice';
        }

        return 'file';
    }
}
