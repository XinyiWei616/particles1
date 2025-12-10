import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
// 确保你已经安装或通过 importmap 引入了这些库
import { Hands } from '@mediapipe/hands'; 
import { Camera } from '@mediapipe/camera_utils'; 

import App from './App'; // 你的粒子渲染组件，现在它将接收 landmarks 数据

// ==========================================================
// 核心追踪组件：负责初始化摄像头和 MediaPipe
// ==========================================================
function HandTracker() {
    const videoRef = useRef(null);
    // handLandmarks: 存储 MediaPipe 返回的手部关键点数据
    const [handLandmarks, setHandLandmarks] = useState(null); 
    // isLoaded: 标记模型和摄像头是否初始化成功
    const [isLoaded, setIsLoaded] = useState(false); 

    useEffect(() => {
        // 1. 初始化 MediaPipe Hands 模型
        const hands = new Hands({
            locateFile: (file) => {
                // MediaPipe 模型文件路径
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });
        
        hands.setOptions({
            maxNumHands: 1, // 只追踪一只手
            modelComplexity: 1, 
            minDetectionConfidence: 0.7, // 提高一点精度要求
            minTrackingConfidence: 0.7
        });

        // 2. 接收到关键点结果时触发
        hands.onResults((results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                // 将第一个手部关键点数据存储到 state
                setHandLandmarks(results.multiHandLandmarks[0]); 
            } else {
                setHandLandmarks(null); // 没有检测到手时设为 null
            }
        });
        
        // 3. 设置摄像头输入
        // 必须创建一个 <video> 元素来作为输入源
        const camera = new Camera(videoRef.current, {
            onFrame: async () => {
                // 每一帧都将视频图像发送给 MediaPipe 进行处理
                await hands.send({ image: videoRef.current });
            },
            width: 640,
            height: 480
        });

        camera.start();
        setIsLoaded(true); // 标记加载成功

        // 清理函数：组件卸载时停止摄像头
        return () => {
            camera.stop();
        };
    }, []);

    // 渲染部分
    return (
        <>
            {/* 隐藏的视频元素：MediaPipe 需要一个 DOM 元素作为输入源 */}
            <video 
                ref={videoRef} 
                style={{ 
                    display: 'none', // 隐藏视频画面
                    position: 'absolute' 
                }} 
            />
            
            {/* 确保 App 组件现在接收 landmarks 作为 prop */}
            {isLoaded ? (
                <App landmarks={handLandmarks} />
            ) : (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    Loading Hand Tracking Model...
                </div>
            )}
        </>
    );
}

// ==========================================================
// 入口渲染逻辑：用 HandTracker 替换原来的 App
// ==========================================================
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* 现在渲染 HandTracker，它会在内部渲染 App */}
    <HandTracker /> 
  </React.StrictMode>
);
