<?php

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AttendeeController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\UploadController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/wechat-login', [AuthController::class, 'wechatLogin']);

    Route::middleware('auth:api')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/refresh', [AuthController::class, 'refresh']);
    });
});

Route::get('/posts', [PostController::class, 'index']);
Route::get('/posts/{post}', [PostController::class, 'show']);

// Guest AI chat — no login required, rate-limited to 30 requests/minute per IP
Route::middleware('throttle:30,1')->group(function () {
    Route::post('/ai/guest-chat-stream', [AiController::class, 'chatStream']);
});

// Public attendee sign-up — rate-limited to prevent abuse
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/attendees', [AttendeeController::class, 'store']);
});

Route::middleware('auth:api')->group(function () {
    Route::post('/posts', [PostController::class, 'store']);
    Route::put('/posts/{post}', [PostController::class, 'update']);
    Route::delete('/posts/{post}', [PostController::class, 'destroy']);

    Route::post('/ai/chat', [AiController::class, 'chat']);
    Route::post('/ai/chat-stream', [AiController::class, 'chatStream']);

    Route::post('/uploads', [UploadController::class, 'store']);
});
