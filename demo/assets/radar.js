const data = {
    labels: ['Speed', 'Quality', 'Reliability', 'Support', 'Coverage', 'Value'],
    datasets: [
        { label: 'Team A', data: [90, 35, 75, 20, 55, 85], borderWidth: 2, pointRadius: 3 },
        { label: 'Team B', data: [30, 85, 45, 95, 70, 25], borderWidth: 2, pointRadius: 3 },
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
