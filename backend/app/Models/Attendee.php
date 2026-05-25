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
        'email',
        'source',
        'ip',
        'user_agent',
    ];
}
