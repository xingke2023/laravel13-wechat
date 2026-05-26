<?php

namespace App\Models;

use Database\Factories\AttendeeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendee extends Model
{
    /** @use HasFactory<AttendeeFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'industry',
        'company',
        'email',
        'source',
        'group_key',
        'ip',
        'user_agent',
    ];
}
