<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendeeController extends Controller
{
    /**
     * Store a newly registered attendee.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'phone' => ['required', 'string', 'regex:/^\+?(86\d{11}|852\d{8}|\d{8,11})$/'],
            'industry' => ['required', 'string', 'max:50'],
            'company' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:120'],
            'source' => ['nullable', 'string', 'max:32'],
            'group_key' => ['nullable', 'string', 'in:group1,group2,group3'],
        ], [
            'phone.regex' => '请输入有效的手机号码',
            'group_key.in' => '无效的群组编号',
        ]);

        $attendee = Attendee::create([
            'name' => $data['name'],
            'phone' => $data['phone'],
            'industry' => $data['industry'],
            'company' => $data['company'] ?? null,
            'email' => $data['email'] ?? null,
            'source' => $data['source'] ?? 'web',
            'group_key' => $data['group_key'] ?? null,
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 500),
        ]);

        return response()->json([
            'message' => '登记成功',
            'attendee' => $attendee,
        ], 201);
    }
}
