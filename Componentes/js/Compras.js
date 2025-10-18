document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const fechaInicioInput = document.getElementById('fecha-inicio');
    const fechaFinInput = document.getElementById('fecha-fin');
    const btnConsultar = document.getElementById('btn-consultar');
    const comprasTableContainer = document.getElementById('compras-table-container');
    const comprasTbody = document.getElementById('compras-tbody');
    const btnGuardarCompra = document.getElementById('btn-guardar-compra');
    const saldoTotalElement = document.getElementById('saldo-total');
    const saldoDisponibleElement = document.getElementById('saldo-disponible');
    const saldoGastadoElement = document.getElementById('saldo-gastado');

    // Unidades disponibles
    const unidades = ['Kg', 'Bulto', 'Caja', 'Unidad', 'Rama', 'Bandeja', 'Maleta', 'Libra', 'Arroba'];

    // Event listeners
    btnConsultar.addEventListener('click', consultarPedidos);
    btnGuardarCompra.addEventListener('click', guardarCompra);

    // Establecer fechas por defecto (hoy)
    const hoy = new Date().toISOString().split('T')[0];
    fechaInicioInput.value = hoy;
    fechaFinInput.value = hoy;

    // Cargar automáticamente los pedidos del día actual
    setTimeout(() => {
        consultarPedidos();
    }, 500); // Pequeño delay para asegurar que Firebase esté cargado

    // Función para consultar pedidos en el rango de fechas
    async function consultarPedidos() {
        const fechaInicio = fechaInicioInput.value;
        const fechaFin = fechaFinInput.value;

        if (!fechaInicio || !fechaFin) {
            alert('Por favor selecciona ambas fechas de inicio y fin.');
            return;
        }

        try {
            // Consultar pedidos en el rango de fechas
            const pedidosQuery = firebase.query(
                window.pedidosRef,
                firebase.where('fechaCreacion', '>=', new Date(fechaInicio)),
                firebase.where('fechaCreacion', '<=', new Date(fechaFin + 'T23:59:59'))
            );

            const pedidosSnapshot = await firebase.getDocs(pedidosQuery);
            const pedidos = [];

            pedidosSnapshot.forEach(doc => {
                pedidos.push({ id: doc.id, ...doc.data() });
            });

            // Calcular saldos
            const saldos = await calcularSaldos(pedidos, fechaInicio, fechaFin);
            saldoTotalElement.textContent = `$${saldos.total.toLocaleString('es-CO')}`;
            saldoDisponibleElement.textContent = `$${saldos.disponible.toLocaleString('es-CO')}`;
            saldoGastadoElement.textContent = `$${saldos.gastado.toLocaleString('es-CO')}`;

            // Agrupar productos y sumar cantidades
            const productosAgrupados = agruparProductos(pedidos);

            // Mostrar tabla con productos consolidados
            mostrarTablaCompras(productosAgrupados);

        } catch (error) {
            console.error('Error al consultar pedidos:', error);
            alert('Error al consultar pedidos. Inténtalo de nuevo.');
        }
    }

    // Función para calcular los saldos
    async function calcularSaldos(pedidos, fechaInicio, fechaFin) {
        // Saldo Total: suma de todos los valorEfectivo de los pedidos en el rango
        const saldoTotal = pedidos.reduce((total, pedido) => {
            return total + (pedido.valorEfectivo || 0);
        }, 0);

        // Saldo Gastado: suma de los costos totales de las compras realizadas en el rango
        let saldoGastado = 0;
        try {
            const comprasQuery = firebase.query(
                window.comprasRef,
                firebase.where('fechaCompra', '>=', new Date(fechaInicio)),
                firebase.where('fechaCompra', '<=', new Date(fechaFin + 'T23:59:59'))
            );

            const comprasSnapshot = await firebase.getDocs(comprasQuery);
            comprasSnapshot.forEach(doc => {
                const compra = doc.data();
                if (compra.productos && Array.isArray(compra.productos)) {
                    compra.productos.forEach(producto => {
                        saldoGastado += producto.costoTotal || 0;
                    });
                }
            });
        } catch (error) {
            console.error('Error al consultar compras:', error);
        }

        // Saldo Disponible: Saldo Total - Saldo Gastado
        const saldoDisponible = saldoTotal - saldoGastado;

        return {
            total: saldoTotal,
            disponible: saldoDisponible,
            gastado: saldoGastado
        };
    }

    // Función para agrupar productos y sumar cantidades
    function agruparProductos(pedidos) {
        const productosMap = new Map();

        pedidos.forEach(pedido => {
            if (pedido.productos && Array.isArray(pedido.productos)) {
                pedido.productos.forEach(producto => {
                    const key = `${producto.nombre}-${producto.unidad}`;
                    if (productosMap.has(key)) {
                        productosMap.get(key).cantidadTotal += producto.cantidad;
                    } else {
                        productosMap.set(key, {
                            nombre: producto.nombre,
                            unidad: producto.unidad,
                            cantidadTotal: producto.cantidad
                        });
                    }
                });
            }
        });

        return Array.from(productosMap.values());
    }

    // Función para mostrar la tabla de compras
    function mostrarTablaCompras(productos) {
        comprasTbody.innerHTML = '';

        productos.forEach(producto => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${producto.nombre}</td>
                <td>${producto.cantidadTotal} ${producto.unidad}</td>
                <td><input type="number" class="cantidad-comprar" min="0" step="0.01" placeholder="0"></td>
                <td><input type="text" class="proveedor-input" placeholder="Proveedor"></td>
                <td>
                    <select class="unidad-select">
                        ${unidades.map(unidad => `<option value="${unidad}" ${unidad === producto.unidad ? 'selected' : ''}>${unidad}</option>`).join('')}
                    </select>
                </td>
                <td><input type="number" class="costo-unitario" min="0" step="0.01" placeholder="0"></td>
                <td class="costo-total">$0</td>
            `;

            comprasTbody.appendChild(row);
        });

        // Agregar event listeners para calcular costos
        document.querySelectorAll('.cantidad-comprar, .costo-unitario').forEach(input => {
            input.addEventListener('input', calcularCostoTotal);
        });

        // Mostrar contenedor de tabla
        comprasTableContainer.style.display = 'block';

        // Habilitar botón guardar
        btnGuardarCompra.disabled = false;
    }

    // Función para calcular costo total
    function calcularCostoTotal() {
        const row = this.closest('tr');
        const cantidad = parseFloat(row.querySelector('.cantidad-comprar').value) || 0;
        const costoUnitario = parseFloat(row.querySelector('.costo-unitario').value) || 0;
        const costoTotal = cantidad * costoUnitario;

        row.querySelector('.costo-total').textContent = `$${costoTotal.toLocaleString('es-CO')}`;
    }

    // Función para guardar la compra
    async function guardarCompra() {
        const fechaCompra = new Date(); // Usar fecha actual del sistema

        // Validar que al menos un producto tenga cantidad > 0
        const productosCompra = [];
        let hasValidProduct = false;

        document.querySelectorAll('#compras-tbody tr').forEach(row => {
            const cantidad = parseFloat(row.querySelector('.cantidad-comprar').value) || 0;
            const proveedor = row.querySelector('.proveedor-input').value.trim();
            const unidad = row.querySelector('.unidad-select').value;
            const costoUnitario = parseFloat(row.querySelector('.costo-unitario').value) || 0;
            const nombre = row.cells[0].textContent;

            if (cantidad > 0) {
                if (!proveedor) {
                    alert(`Por favor ingresa el proveedor para ${nombre}.`);
                    return;
                }
                productosCompra.push({
                    nombre,
                    cantidad,
                    proveedor,
                    unidad,
                    costoUnitario,
                    costoTotal: cantidad * costoUnitario
                });
                hasValidProduct = true;
            }
        });

        if (!hasValidProduct) {
            alert('Debes ingresar al menos un producto con cantidad mayor a 0.');
            return;
        }

        try {
            // Crear documento de compra
            const compraData = {
                fechaCompra: new Date(fechaCompra),
                fechaInicio: new Date(fechaInicioInput.value),
                fechaFin: new Date(fechaFinInput.value),
                productos: productosCompra,
                fechaCreacion: new Date()
            };

            await firebase.addDoc(window.comprasRef, compraData);

            alert('Compra guardada exitosamente.');

            // Limpiar formulario y recargar datos
            comprasTableContainer.style.display = 'none';
            btnGuardarCompra.disabled = true;

            // Volver a consultar pedidos para actualizar saldos
            consultarPedidos();

        } catch (error) {
            console.error('Error al guardar compra:', error);
            alert('Error al guardar la compra. Inténtalo de nuevo.');
        }
    }
});