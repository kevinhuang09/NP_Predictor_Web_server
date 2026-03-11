document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predictorForm');
    const loading = document.getElementById('loadingStatus');
    const resultContainer = document.getElementById('resultContainer');
    const resultTableBody = document.getElementById('resultTableBody');
    
    // 如果你有一個 p 標籤用來顯示 loading 文字，就抓它，否則這只是一個備用
    const loadingText = loading.querySelector('p') || { innerText: '' }; 

    // ngrok 的網址
    const baseUrl = 'https://gypsiferous-lavern-nonprobably.ngrok-free.dev';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fastaInput = document.getElementById('fastaInput').value.trim();
        const fileInput = document.getElementById('fileInput').files[0];
        const taskName = document.getElementById('jobTitle').value || "Untitled_Task";
        const email = document.getElementById('userEmail').value;

        // 基本檢查
        if (!fastaInput && !fileInput) {
            alert("Please provide a FASTA sequence or upload a file.");
            return;
        }

        const MAX_FILE_SIZE = 5 * 1024 * 1024; 
        if (fileInput && fileInput.size > MAX_FILE_SIZE) {
            alert("檔案太大了！請限制在 5MB 以內。");
            return;
        }

        // 啟動 Loading 介面
        loading.classList.remove('hidden');
        loadingText.innerText = "Uploading data to server...";
        if (resultContainer) resultContainer.classList.add('hidden');

        try {
            let finalSequence = fastaInput;
            if (fileInput) {
                finalSequence = await readFileContent(fileInput);
            }

            // === 步驟 1：送出檔案並取得 Task ID ===
            const response = await fetch(`${baseUrl}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true' // 避開 ngrok 警告頁
                },
                body: JSON.stringify({
                    task_name: taskName,
                    email: email,
                    sequence: finalSequence
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const startResult = await response.json();
            
            if (startResult.status !== "started") {
                alert("Upload failed: " + startResult.message);
                loading.classList.add('hidden');
                return;
            }

            // 顯示上傳成功
            const taskId = startResult.task_id;
            console.log("Task Started:", taskId);
            loadingText.innerText = `上傳成功！正在計算中... (Task: ${taskId})`;

            // === 步驟 2：開始輪詢 (每 5 秒問一次) ===
            const MAX_WAIT_MS = 180 * 1000; // 最大等待時間 3 分鐘
            const POLL_INTERVAL = 5000;     // 5 秒問一次
            let elapsedTime = 0;

            const pollTimer = setInterval(async () => {
                elapsedTime += POLL_INTERVAL;
                loadingText.innerText = `模型運算中... 耗時: ${elapsedTime/1000} 秒 (上限 180 秒)`;

                try {
                    // 呼叫 check_status 路由
                    const statusRes = await fetch(`${baseUrl}/check_status/${taskId}`, {
                        headers: {
                            'ngrok-skip-browser-warning': 'true' // 這裡也要加！
                        }
                    });

                    const statusData = await statusRes.json();

                    if (statusData.status === "completed") {
                        // === 步驟 3：算完了，顯示結果 ===
                        clearInterval(pollTimer);
                        loading.classList.add('hidden');
                        
                        alert("Prediction Completed!");
                        
                        // 將結果畫在網頁表格上
                        renderResultTable(statusData.data);
                        if(resultContainer) {
                            resultContainer.classList.remove('hidden');
                            resultContainer.scrollIntoView({ behavior: 'smooth' });
                        }

                    } else if (statusData.status === "error") {
                        clearInterval(pollTimer);
                        loading.classList.add('hidden');
                        alert("模型運算發生錯誤: " + statusData.message);
                    }
                    // 如果是 "processing"，什麼都不做，等下一個 5 秒

                } catch (pollErr) {
                    console.error("Polling error, retrying...", pollErr);
                    // 網路稍微閃斷，不停止計時器，繼續嘗試
                }

                // 防呆：超過 3 分鐘強制停止
                if (elapsedTime >= MAX_WAIT_MS) {
                    clearInterval(pollTimer);
                    loading.classList.add('hidden');
                    alert("請求逾時！模型運算超過 3 分鐘，請確認伺服器狀態。");
                }

            }, POLL_INTERVAL);

        } catch (error) {
            console.error("Connection Error:", error);
            alert("Failed to connect to the Server. Please ensure Python and ngrok are running.");
            loading.classList.add('hidden');
        }
    });

    // 讀取檔案副程式
    function readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    // 畫出表格的副程式
    function renderResultTable(dataList) {
        if (!resultTableBody) return;
        resultTableBody.innerHTML = ''; 
        
        dataList.forEach(item => {
            const row = document.createElement('tr');
            
            // 決定 Label 的顏色 (綠色 vs 紅色)
            const labelStyle = item.label === 'neuropeptide' 
                ? 'color: #28a745; font-weight: bold;' 
                : 'color: #dc3545; font-weight: bold;';

            row.innerHTML = `
                <td style="padding: 10px; border: 1px solid #ddd;">${item.id}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.score.toFixed(6)}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center; ${labelStyle}">${item.label}</td>
            `;
            resultTableBody.appendChild(row);
        });
    }
});