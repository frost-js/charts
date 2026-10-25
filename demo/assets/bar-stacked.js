const data = {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [
        { label: 'Online', data: [12, 18, 15], borderWidth: 0 },
        { label: 'In store', data: [8, 10, 14], borderWidth: 0 },
        { label: 'Returns', data: [-4, -6, -3], borderWidth: 0 },
    ],
};

for (const orientation of ['vertical', 'horizontal']) {
    new Chart(document.getElementById(`chart-${orientation}`), {
        data,
        title: { display: false },
        orientation,
        stacked: true,
        legend: { position: 'bottom' },
    });
}
