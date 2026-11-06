@file:JvmName("MuslimCord")
package com.snt.muslimcord

import android.media.AudioAttributes
import android.media.MediaPlayer
import android.util.Base64
import app.valenced.plugins.plugin
import app.valenced.xposed.api.registerNativeMethod
import app.valenced.xposed.api.registerNativeAsyncMethod
import java.io.File

@Suppress("UNUSED")
val muslimCord = plugin {
    var player: MediaPlayer? = null
    lateinit var pluginStorageDir: File
    fun audioDir(): File = File(pluginStorageDir, "audio").also { it.mkdirs() }
    start {
        pluginStorageDir = storageDir
        registerNativeAsyncMethod("${manifest.id}.writeAudio") { args ->
            val key = args.getOrNull(0)?.toString() ?: error("missing audio key")
            val encoded = args.getOrNull(1)?.toString() ?: error("missing audio data")
            val safe = key.replace(Regex("[^A-Za-z0-9_-]"), "_")
            val target = File(audioDir(), "$safe.bin")
            target.writeBytes(Base64.decode(encoded, Base64.DEFAULT))
            target.absolutePath
        }
        registerNativeAsyncMethod("${manifest.id}.playAudio") { args ->
            val key = args.getOrNull(0)?.toString() ?: error("missing audio key")
            val safe = key.replace(Regex("[^A-Za-z0-9_-]"), "_")
            val target = File(audioDir(), "$safe.bin")
            if (!target.exists()) error("audio is not downloaded")
            player?.release()
            player = MediaPlayer().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                setDataSource(target.absolutePath)
                setOnCompletionListener { it.release(); if (player === it) player = null }
                prepare()
                start()
            }
            Unit
        }
        registerNativeMethod("${manifest.id}.stopAudio") {
            player?.stop()
            player?.release()
            player = null
            Unit
        }
    }
    stop {
        player?.stop()
        player?.release()
        player = null
    }
}
