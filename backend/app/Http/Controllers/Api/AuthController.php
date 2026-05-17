<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create($data);

        $token = auth('api')->login($user);

        return $this->respondWithToken($token);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! $token = auth('api')->attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        return $this->respondWithToken($token);
    }

    public function me(): JsonResponse
    {
        return response()->json(auth('api')->user());
    }

    public function logout(): JsonResponse
    {
        auth('api')->logout();

        return response()->json(['message' => 'Successfully logged out']);
    }

    public function refresh(): JsonResponse
    {
        return $this->respondWithToken(auth('api')->refresh());
    }

    public function wechatLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:128'],
            'nickname' => ['nullable', 'string', 'max:64'],
            'avatar' => ['nullable', 'string', 'max:512'],
        ]);

        $appid = (string) config('services.wechat.appid');
        $secret = (string) config('services.wechat.appsecret');

        if ($appid === '' || $secret === '' || $secret === 'PUT_REAL_SECRET_HERE') {
            return response()->json([
                'message' => '微信登录暂未配置',
                'detail' => 'WECHAT_APPSECRET is missing on the server.',
            ], 503);
        }

        $resp = Http::timeout(10)
            ->get('https://api.weixin.qq.com/sns/jscode2session', [
                'appid' => $appid,
                'secret' => $secret,
                'js_code' => $data['code'],
                'grant_type' => 'authorization_code',
            ]);

        if (! $resp->successful()) {
            return response()->json([
                'message' => '微信服务暂时不可用',
                'detail' => 'HTTP '.$resp->status(),
            ], 502);
        }

        $body = $resp->json();
        $openid = $body['openid'] ?? null;

        if (! $openid) {
            return response()->json([
                'message' => '微信登录失败',
                'detail' => $body['errmsg'] ?? 'no openid',
                'errcode' => $body['errcode'] ?? null,
            ], 400);
        }

        $user = User::firstOrNew(['wx_openid' => $openid]);
        if (! $user->exists) {
            $user->name = $data['nickname'] ?? '微信用户';
            $user->email = 'wx_'.$openid.'@wx.local';
            $user->password = bcrypt(Str::random(32));
        } elseif (! empty($data['nickname']) && $user->name === '微信用户') {
            $user->name = $data['nickname'];
        }
        if (! empty($body['unionid'])) {
            $user->wx_unionid = $body['unionid'];
        }
        $user->save();

        $token = auth('api')->login($user);

        return $this->respondWithToken($token);
    }

    private function respondWithToken(string $token): JsonResponse
    {
        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => auth('api')->user(),
        ]);
    }
}
