document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predictorForm');
    const loading = document.getElementById('loadingStatus');
    const loadingText = loading.querySelector('p'); // 抓取文字標籤來顯示進度
    const resultContainer = document.getElementById('resultContainer');
    const resultTableBody = document.getElementById('resultTableBody');
    const baseUrl = 'https://gypsiferous-lavern-nonprobably.ngrok-free.dev';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fastaInput = document.getElementById('fastaInput').value.trim();
        const fileInput = document.getElementById('fileInput').files[0];
        const taskName = document.getElementById('jobTitle').value || "Untitled_Task";
        const email = document.getElementById('userEmail').value;

        if (!fastaInput && !fileInput) {
            alert("Please provide a FASTA sequence or upload a file.");
            return;
        }

        const MAX_FILE_SIZE = 5 * 1024 * 1024; 
        if (fileInput && fileInput.size > MAX_FILE_SIZE) {
            alert("檔案太大了！請限制在 5MB 以內。");
            return;
        }

        // 顯示 Loading 並初始化文字
        loading.classList.remove('hidden');
        loadingText.innerText = "Submitting task to server...";
        if (resultContainer) resultContainer.classList.add('hidden');

        try {
            let finalSequence = fastaInput;
            if (fileInput) {
                finalSequence = await readFileContent(fileInput);
            }

            // 1. 發送請求開始預測任務
            const response = await fetch(`${baseUrl}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task_name: taskName,
                    email: email,
                    sequence: finalSequence
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const startResult = await response.json();
            const taskId = startResult.task_id; // 取得後端給的任務 ID

            // 2. 開始輪詢 (Polling)
            const MAX_WAIT = 180 * 1000; // 3 分鐘 (180,000 毫秒)
            const POLL_INTERVAL = 5000;  // 5 秒一次
            let timeElapsed = 0;

            const pollTimer = setInterval(async () => {
                timeElapsed += POLL_INTERVAL;
                loadingText.innerText = `Analyzing... ${timeElapsed / 1000}s / 180s`;

                try {
                    // 詢問後端算好了沒
                    const statusRes = await fetch(`${baseUrl}/check_status/${taskId}`);
                    const statusResult = await statusRes.json();

                    if (statusResult.status === "completed") {
                        clearInterval(pollTimer);
                        loading.classList.add('hidden');
                        
                        // 渲染表格 (假設你的表格 HTML 已經準備好)
                        renderResultTable(statusResult.data);
                        resultContainer.classList.remove('hidden');
                        resultContainer.scrollIntoView({ behavior: 'smooth' });
                    } 
                    else if (statusResult.status === "error") {
                        clearInterval(pollTimer);
                        loading.classList.add('hidden');
                        alert("Prediction Error: " + statusResult.message);
                    }
                    // status 為 "processing" 則繼續等待...

                } catch (pollError) {
                    console.error("Polling error:", pollError);
                    // 網路暫時不穩不中斷定時器，繼續嘗試
                }

                // 檢查是否逾時
                if (timeElapsed >= MAX_WAIT) {
                    clearInterval(pollTimer);
                    loading.classList.add('hidden');
                    alert("Timeout! The model is taking too long (over 3 mins). Please check the server or try a smaller batch.");
                }

            }, POLL_INTERVAL);

        } catch (error) {
            console.error("Connection Error:", error);
            loading.classList.add('hidden');
            alert("Failed to connect to the server. Please ensure Python and ngrok are running.");
        }
    });

    // 表格渲染副程式
    function renderResultTable(dataList) {
        if (!resultTableBody) return;
        resultTableBody.innerHTML = ''; 
        dataList.forEach(item => {
            const row = document.createElement('tr');
            const labelClass = item.label === 'neuropeptide' ? 'text-green' : 'text-red';
            row.innerHTML = `
                <td class="p-3 border">${item.id}</td>
                <td class="p-3 border text-center">${item.score.toFixed(6)}</td>
                <td class="p-3 border text-center ${labelClass}">${item.label}</td>
            `;
            resultTableBody.appendChild(row);
        });
    }

    function readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
});