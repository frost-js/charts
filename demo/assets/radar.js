const data = {
    labels: ['Speed', 'Quality', 'Reliability', 'Support', 'Coverage', 'Value'],
    datasets: [
        { label: 'Team A', data: [85, 70, 90, 65, 75, 80], borderWidth: 2, pointRadius: 3 },
        { label: 'Team B', data: [65, 90, 75, 85, 60, 95], borderWidth: 2, pointRadius: 3 },
    ],
};
const chart = new Chart(document.getElementById('chart'), {
    type: 'radar',
    data,
    title: { display: false },
    legend: { position: 'bottom' },
});

document.getElementById('update-data').addEventListener('click', () => {
    const datasets = chart.getData();

    for (const dataset of datasets) {
        dataset.data.push(dataset.data.shift());
    }

    chart.setData({ labels: data.labels, datasets });
    document.getElementById('chart-status').textContent = 'Values shifted to the next category.';
});

document.getElementById('reset-data').addEventListener('click', () => {
    chart.setData(data);
    document.getElementById('chart-status').textContent = 'Showing the original data.';
});
