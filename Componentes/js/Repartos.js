document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const fechaInicioInput = document.getElementById('fecha-inicio');
    const fechaFinInput = document.getElementById('fecha-fin');
    const fechaRepartoInput = document.getElementById('fecha-reparto');
    const btnConsultar = document.getElementById('btn-consultar');
    const repartosTableContainer = document.getElementById('repartos-table-container');
    const repartosTable = document.getElementById('repartos-table');
    const repartosTbody = document.getElementById('repartos-tbody');
    const btnGuardarReparto = document.getElementById('btn-guardar-reparto');

    // Modal de entrega
    const modalEntrega = document.getElementById('modal-entrega');
    const modalProducto = document.getElementById('modal-producto');
    const modalNegocio = document.getElementById('modal-negocio');
    const modalCantidadPedida = document.getElementById('modal-cantidad-pedida');
    const modalCantidadEntregada = document.getElementById('modal-cantidad-entregada');
    const btnGuardarEntrega = document.getElementById('btn-guardar-entrega');
    const btnCancelarEntrega = document.getElementById('btn-cancelar-entrega');
    const closeModal = document.querySelector('.close');

    // Variables para almacenar datos
    let negocios = [];
    let productosComprados = [];
    let pedidosPorProducto = {};
    let entregas = {}; // { producto-negocio: cantidad }

    // Event listeners
    btnConsultar.addEventListener('click', consultarRepartos);
    btnGuardarReparto.addEventListener('click', guardarReparto);
    btnGuardarEntrega.addEventListener('click', guardarEntrega);
    btnCancelarEntrega.addEventListener('click', cerrarModal);
    closeModal.addEventListener('click', cerrarModal);

    // Establecer fechas por defecto
    const hoy = new Date().toISOString().split('T')[0];
    fechaInicioInput.value = hoy;
    fechaFinInput.value = hoy;
    fechaRepartoInput.value = hoy;

    // Función para consultar repartos
    async function consultarRepartos() {
        const fechaInicio = fechaInicioInput.value;
        const fechaFin = fechaFinInput.value;

        if (!fechaInicio || !fechaFin) {
            alert('Por favor selecciona ambas fechas de inicio y fin.');
            return;
        }

        try {
            // Obtener negocios
            const negociosSnapshot = await firebase.getDocs(window.negociosRef);
            negocios = [];
            negociosSnapshot.forEach(doc => {
                negocios.push({ id: doc.id, ...doc.data() });
            });

            // Consultar compras en el rango de fechas
            const comprasQuery = firebase.query(
                window.comprasRef,
                firebase.where('fechaCompra', '>=', new Date(fechaInicio)),
                firebase.where('fechaCompra', '<=', new Date(fechaFin + 'T23:59:59'))
            );

            const comprasSnapshot = await firebase.getDocs(comprasQuery);
            productosComprados = [];

            comprasSnapshot.forEach(doc => {
                const compra = doc.data();
                if (compra.productos && Array.isArray(compra.productos)) {
                    compra.productos.forEach(producto => {
                        productosComprados.push({
                            nombre: producto.nombre,
                            cantidadComprada: producto.cantidad,
                            unidad: producto.unidad
                        });
                    });
                }
            });

            // Agrupar productos comprados
            const productosAgrupados = agruparProductosComprados(productosComprados);

            // Consultar pedidos en el rango para obtener pedidos por negocio
            const pedidosQuery = firebase.query(
                window.pedidosRef,
                firebase.where('fechaCreacion', '>=', new Date(fechaInicio)),
                firebase.where('fechaCreacion', '<=', new Date(fechaFin + 'T23:59:59'))
            );

            const pedidosSnapshot = await firebase.getDocs(pedidosQuery);
            pedidosPorProducto = {};

            pedidosSnapshot.forEach(doc => {
                const pedido = doc.data();
                const negocioNombre = pedido.negocio;

                if (pedido.productos && Array.isArray(pedido.productos)) {
                    pedido.productos.forEach(producto => {
                        const key = `${producto.nombre}-${producto.unidad}`;
                        if (!pedidosPorProducto[key]) {
                            pedidosPorProducto[key] = {};
                        }
                        pedidosPorProducto[key][negocioNombre] = (pedidosPorProducto[key][negocioNombre] || 0) + producto.cantidad;
                    });
                }
            });

            // Inicializar entregas
            entregas = {};

            // Mostrar tabla
            mostrarTablaRepartos(productosAgrupados, negocios);

        } catch (error) {
            console.error('Error al consultar repartos:', error);
            alert('Error al consultar repartos. Inténtalo de nuevo.');
        }
    }

    // Función para agrupar productos comprados
    function agruparProductosComprados(productos) {
        const productosMap = new Map();

        productos.forEach(producto => {
            const key = `${producto.nombre}-${producto.unidad}`;
            if (productosMap.has(key)) {
                productosMap.get(key).cantidadComprada += producto.cantidadComprada;
            } else {
                productosMap.set(key, {
                    nombre: producto.nombre,
                    unidad: producto.unidad,
                    cantidadComprada: producto.cantidadComprada
                });
            }
        });

        return Array.from(productosMap.values());
    }

    // Función para mostrar la tabla de repartos
    function mostrarTablaRepartos(productos, negocios) {
        // Limpiar tabla
        repartosTbody.innerHTML = '';

        // Actualizar encabezado con columnas dinámicas
        const thead = repartosTable.querySelector('thead tr');
        thead.innerHTML = '<th>Producto</th><th>Total Comprado</th>';

        // Agregar columnas para pedidos por negocio
        negocios.forEach(negocio => {
            thead.innerHTML += `<th style="background-color: #A3D977;">${negocio.nombre} (Pedido)</th>`;
        });

        // Agregar columnas para entregas por negocio
        negocios.forEach(negocio => {
            thead.innerHTML += `<th style="background-color: #56C0E0;">${negocio.nombre} (Entregado)</th>`;
        });

        // Crear filas
        productos.forEach(producto => {
            const row = document.createElement('tr');
            const key = `${producto.nombre}-${producto.unidad}`;

            row.innerHTML = `
                <td>${producto.nombre}</td>
                <td>${producto.cantidadComprada} ${producto.unidad}</td>
            `;

            // Columnas de pedidos por negocio
            negocios.forEach(negocio => {
                const cantidadPedida = pedidosPorProducto[key]?.[negocio.nombre] || 0;
                row.innerHTML += `<td>${cantidadPedida}</td>`;
            });

            // Columnas de entregas por negocio (clickeables)
            negocios.forEach(negocio => {
                const entregaKey = `${key}-${negocio.nombre}`;
                const cantidadEntregada = entregas[entregaKey] || 0;
                const cantidadPedida = pedidosPorProducto[key]?.[negocio.nombre] || 0;

                let bgColor = '#ffcccc'; // Rojo por defecto
                if (cantidadEntregada === cantidadPedida && cantidadPedida > 0) {
                    bgColor = '#ccffcc'; // Verde
                } else if (cantidadEntregada > 0 && cantidadEntregada < cantidadPedida) {
                    bgColor = '#ffffcc'; // Amarillo
                }

                row.innerHTML += `<td class="entrega-cell" data-producto="${producto.nombre}" data-unidad="${producto.unidad}" data-negocio="${negocio.nombre}" data-pedida="${cantidadPedida}" style="background-color: ${bgColor}; cursor: pointer;">${cantidadEntregada}</td>`;
            });

            repartosTbody.appendChild(row);
        });

        // Agregar event listeners a las celdas de entrega
        document.querySelectorAll('.entrega-cell').forEach(cell => {
            cell.addEventListener('click', abrirModalEntrega);
        });

        // Mostrar contenedor
        repartosTableContainer.style.display = 'block';
        btnGuardarReparto.disabled = false;
    }

    // Función para abrir modal de entrega
    function abrirModalEntrega() {
        const producto = this.dataset.producto;
        const unidad = this.dataset.unidad;
        const negocio = this.dataset.negocio;
        const cantidadPedida = parseFloat(this.dataset.pedida) || 0;

        modalProducto.textContent = producto;
        modalNegocio.textContent = negocio;
        modalCantidadPedida.textContent = `${cantidadPedida} ${unidad}`;

        // Establecer cantidad actual entregada
        const key = `${producto}-${unidad}-${negocio}`;
        modalCantidadEntregada.value = entregas[key] || 0;

        // Guardar datos en el modal para referencia
        modalEntrega.dataset.producto = producto;
        modalEntrega.dataset.unidad = unidad;
        modalEntrega.dataset.negocio = negocio;

        modalEntrega.style.display = 'block';
    }

    // Función para guardar entrega desde modal
    function guardarEntrega() {
        const producto = modalEntrega.dataset.producto;
        const unidad = modalEntrega.dataset.unidad;
        const negocio = modalEntrega.dataset.negocio;
        const cantidadEntregada = parseFloat(modalCantidadEntregada.value) || 0;

        const key = `${producto}-${unidad}-${negocio}`;
        entregas[key] = cantidadEntregada;

        // Cerrar modal
        cerrarModal();

        // Actualizar tabla
        consultarRepartos();
    }

    // Función para cerrar modal
    function cerrarModal() {
        modalEntrega.style.display = 'none';
    }

    // Función para guardar reparto completo
    async function guardarReparto() {
        const fechaReparto = fechaRepartoInput.value;

        if (!fechaReparto) {
            alert('Por favor selecciona la fecha de reparto.');
            return;
        }

        try {
            // Crear array de entregas
            const entregasArray = [];

            for (const [key, cantidadEntregada] of Object.entries(entregas)) {
                const [productoUnidad, negocio] = key.split('-').reduce((acc, part, index, arr) => {
                    if (index < arr.length - 1) {
                        acc[0] += (acc[0] ? '-' : '') + part;
                    } else {
                        acc[1] = part;
                    }
                    return acc;
                }, ['', '']);

                const [producto, unidad] = productoUnidad.split('-');
                const cantidadPedida = pedidosPorProducto[productoUnidad]?.[negocio] || 0;

                let estado = 'no entregado';
                if (cantidadEntregada === cantidadPedida && cantidadPedida > 0) {
                    estado = 'completo';
                } else if (cantidadEntregada > 0 && cantidadEntregada < cantidadPedida) {
                    estado = 'parcial';
                }

                entregasArray.push({
                    producto,
                    unidad,
                    negocio,
                    cantidadPedida,
                    cantidadEntregada,
                    estado,
                    fechaReparto: new Date(fechaReparto)
                });
            }

            if (entregasArray.length === 0) {
                alert('No hay entregas para guardar.');
                return;
            }

            // Guardar en Firebase
            const repartoData = {
                fechaReparto: new Date(fechaReparto),
                fechaInicio: new Date(fechaInicioInput.value),
                fechaFin: new Date(fechaFinInput.value),
                entregas: entregasArray,
                fechaCreacion: new Date()
            };

            await firebase.addDoc(window.repartosRef, repartoData);

            alert('Reparto guardado exitosamente.');

            // Limpiar formulario
            repartosTableContainer.style.display = 'none';
            btnGuardarReparto.disabled = true;
            entregas = {};

        } catch (error) {
            console.error('Error al guardar reparto:', error);
            alert('Error al guardar el reparto. Inténtalo de nuevo.');
        }
    }
});