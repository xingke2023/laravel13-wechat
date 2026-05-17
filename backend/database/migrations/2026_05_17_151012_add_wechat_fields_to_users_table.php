<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('wx_openid', 64)->nullable()->unique()->after('email');
            $table->string('wx_unionid', 64)->nullable()->after('wx_openid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['wx_openid']);
            $table->dropColumn(['wx_openid', 'wx_unionid']);
        });
    }
};
