"""ContentStudio audio: narration (TTS), word timing (Whisper), estimated timing and the soundtrack mixer.

Everything runs locally and free: Kokoro-82M via kokoro-onnx for the voice, faster-whisper for word timings,
numpy/scipy for procedural sound effects and music. Entry point: ``python -m studio_audio <command>``.
"""
__version__ = '1.0.0'
