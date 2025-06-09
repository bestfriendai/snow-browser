@echo off
echo Starting Snow Browser in Debug Mode...
echo.
echo If you see any error messages, please copy them.
echo Press Ctrl+C to stop the browser.
echo.

cd /d "%~dp0dist-snow-red\win-unpacked"

echo Trying normal startup...
snow.exe
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Normal startup failed with error code: %ERRORLEVEL%
    echo.
    echo Trying with GPU disabled...
    snow.exe --disable-gpu
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo GPU disabled startup failed with error code: %ERRORLEVEL%
        echo.
        echo Trying with hardware acceleration disabled...
        snow.exe --disable-hardware-acceleration
        if %ERRORLEVEL% NEQ 0 (
            echo.
            echo Hardware acceleration disabled startup failed with error code: %ERRORLEVEL%
            echo.
            echo Trying with sandbox disabled (less secure)...
            snow.exe --no-sandbox
            if %ERRORLEVEL% NEQ 0 (
                echo.
                echo All startup methods failed. Error code: %ERRORLEVEL%
                echo Please check Windows Event Viewer for more details.
            )
        )
    )
)

echo.
pause
