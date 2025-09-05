#!/bin/bash

# Minimal Pomodoro WebApp Management Script
# Usage: ./manage-webapp.sh [start|stop|status|restart|build]

APP_NAME="minimal-pomodoro-webapp"
PID_FILE="$APP_NAME.pid"
PORT=3000

case "$1" in
    build)
        echo "🔨 Building production version..."
        npm run build:prod
        echo "✅ Build completed!"
        ;;
    
    start)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "⚠️  $APP_NAME is already running with PID: $(cat $PID_FILE)"
        else
            echo "🚀 Starting $APP_NAME..."
            
            # Install serve globally if not installed
            if ! command -v serve &> /dev/null; then
                echo "📦 Installing serve globally..."
                npm install -g serve
            fi
            
            # Start the server
            nohup npm run serve:low-mem > /dev/null 2>&1 & 
            echo $! > "$PID_FILE"
            echo "✅ $APP_NAME started with PID: $(cat $PID_FILE)"
            echo "🌐 Access at: http://localhost:$PORT"
            echo "💾 Memory usage: ~64-128MB"
        fi
        ;;
    
    stop)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID"
                rm -f "$PID_FILE"
                echo "❌ $APP_NAME stopped (PID: $PID)"
            else
                echo "⚠️  Process $PID not found, removing stale PID file"
                rm -f "$PID_FILE"
            fi
        else
            echo "⚠️  $APP_NAME is not running (no PID file found)"
        fi
        ;;
    
    status)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                echo "✅ $APP_NAME is running with PID: $PID"
                echo "🌐 URL: http://localhost:$PORT"
                
                # Show memory usage if possible
                if command -v ps &> /dev/null; then
                    MEM=$(ps -o pid,rss -p "$PID" | tail -n1 | awk '{print $2}')
                    if [ -n "$MEM" ] && [ "$MEM" != "RSS" ]; then
                        echo "💾 Memory: ${MEM}KB (~$((MEM/1024))MB)"
                    fi
                fi
            else
                echo "❌ $APP_NAME is not running (stale PID file)"
                rm -f "$PID_FILE"
            fi
        else
            echo "❌ $APP_NAME is not running"
        fi
        ;;
    
    restart)
        echo "🔄 Restarting $APP_NAME..."
        $0 stop
        sleep 2
        $0 start
        ;;
    
    setup)
        echo "🛠️  Complete setup and start..."
        $0 build
        $0 start
        ;;
    
    *)
        echo "📋 Minimal Pomodoro WebApp Management"
        echo ""
        echo "Usage: $0 {build|start|stop|status|restart|setup}"
        echo ""
        echo "Commands:"
        echo "  build   - Build production version"
        echo "  start   - Start the server in background"
        echo "  stop    - Stop the server"
        echo "  status  - Check server status"
        echo "  restart - Restart the server"
        echo "  setup   - Build and start (complete setup)"
        echo ""
        echo "Examples:"
        echo "  $0 setup     # Complete setup and start"
        echo "  $0 start     # Start server"
        echo "  $0 status    # Check if running"
        echo "  $0 stop      # Stop server"
        echo ""
        exit 1
        ;;
esac