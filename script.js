document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predictorForm');
    const loading = document.getElementById('loadingStatus');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const fasta = document.getElementById('fastaInput').value.trim();
        const file = document.getElementById('fileInput').files[0];

        if (!fasta && !file) {
            alert("Please provide a FASTA sequence or upload a file.");
            return;
        }

        loading.classList.remove('hidden');
        
        console.log("Job submitted to UTCS MLB Lab server...");

        setTimeout(() => {
            loading.classList.add('hidden');
            alert("Submission Successful! The results will be sent to your email or displayed here.");
        }, 2000);
    });
});