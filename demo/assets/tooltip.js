const data = {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [
        { label: 'Online', data: [12, 18, 15], borderWidth: 0 },
        { label: 'In store', data: [8, 10, 14], borderWidth: 0 },
    ],
};

for (const position of ['cursor', 'fixed', 'hidden']) {
    new Chart(document.getElementById(`chart-${position}`), {
        data,
        title: { display: false },
        legend: { display: false },
        tooltip: {
            display: position !== 'hidden',
            position: position === 'hidden' ? 'cursor' : position,
        },
    });
}
