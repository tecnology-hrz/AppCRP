// Variables globales
let negocioSeleccionado = null;
let productos = [];
let pedidoActual = {
    fecha: '',
    personaResponsable: '',
    valorEfectivo: 0,
    productos: []
};

// Unidades disponibles
const unidades = ['Kg', 'Bulto', 'Caja', 'Unidad', 'Rama', 'Bandeja', 'Maleta', 'Libra', 'Arroba'];

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarNegocios();
    configurarEventos();
    setFechaActual();
});

// Establecer fecha actual
function setFechaActual() {
    const fechaInput = document.getElementById('fecha-pedido');
    const hoy = new Date();
    // Ajustar zona horaria para Colombia (UTC-5)
    const offset = hoy.getTimezoneOffset() * 60000; // offset en milisegundos
    const fechaColombia = new Date(hoy.getTime() - offset - (5 * 3600000)); // Restar 5 horas para UTC-5
    const fechaFormateada = fechaColombia.toISOString().split('T')[0];
    fechaInput.value = fechaFormateada;
}

// Cargar negocios desde Firebase
async function cargarNegocios() {
    try {
        const querySnapshot = await firebase.getDocs(window.negociosRef);
        const negociosSelector = document.getElementById('negocios-selector');
        negociosSelector.innerHTML = ''; // Limpiar contenido anterior

        if (querySnapshot.empty) {
            // Si no hay negocios, mostrar mensaje
            negociosSelector.innerHTML = '<p>No hay negocios registrados. Configure Firebase con datos de ejemplo.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const negocio = doc.data();
            const button = document.createElement('button');
            button.className = 'btn-negocio';
            button.textContent = negocio.nombre;
            button.dataset.id = doc.id;
            button.addEventListener('click', () => seleccionarNegocio(doc.id, negocio.nombre));
            negociosSelector.appendChild(button);
        });
    } catch (error) {
        console.error('Error cargando negocios:', error);
        alert('Error al cargar negocios desde la base de datos. Verifique la configuración de Firebase.');
    }
}

// Seleccionar un negocio
function seleccionarNegocio(id, nombre) {
    negocioSeleccionado = { id, nombre };

    // Resaltar botón activo
    document.querySelectorAll('.btn-negocio').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Mostrar módulo de pedido
    document.getElementById('pedido-module').style.display = 'block';
    document.getElementById('module-title').textContent = `Gestión Completa - ${nombre}`;

    // Resetear pasos
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2').style.display = 'none';

    // Limpiar formulario
    document.getElementById('datos-obligatorios-form').reset();
    setFechaActual();

    cargarProductos();
}

// Cargar productos desde Firebase
async function cargarProductos() {
    try {
        const querySnapshot = await firebase.getDocs(window.productosRef);
        productos = [];

        querySnapshot.forEach((doc) => {
            const producto = { id: doc.id, ...doc.data() };
            productos.push(producto);
        });

        if (productos.length === 0) {
            alert('No hay productos registrados en la base de datos. Configure Firebase con datos de ejemplo.');
        }

        mostrarProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        alert('Error al cargar productos desde la base de datos. Verifique la configuración de Firebase.');
    }
}

// Mostrar productos en la tabla
function mostrarProductos(filtro = '') {
    const tbody = document.getElementById('productos-tbody');
    tbody.innerHTML = '';

    const productosFiltrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(filtro.toLowerCase())
    );

    productosFiltrados.forEach(producto => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${producto.nombre}</td>
            <td>
                <select class="unidad-select">
                    ${unidades.map(u => `<option value="${u}" ${u === producto.unidad ? 'selected' : ''}>${u}</option>`).join('')}
                </select>
            </td>
            <td><input type="number" class="cantidad-input" min="0" step="0.1" placeholder="0"></td>
            <td><button class="btn-editar" data-id="${producto.id}"><i class="fas fa-edit"></i></button></td>
        `;

        tbody.appendChild(row);
    });

    // Agregar event listeners a los inputs de cantidad
    document.querySelectorAll('.cantidad-input').forEach(input => {
        input.addEventListener('input', verificarProductosPedido);
    });

    // Verificar estado inicial del botón guardar
    verificarProductosPedido();
}

// Configurar eventos
function configurarEventos() {
    // Formulario de datos obligatorios
    document.getElementById('datos-obligatorios-form').addEventListener('submit', guardarDatosObligatorios);

    // Formateo de moneda en tiempo real
    document.getElementById('valor-efectivo').addEventListener('input', formatearMoneda);
    document.getElementById('editar-valor').addEventListener('input', formatearMoneda);

    // Buscador de productos
    document.getElementById('buscador-productos').addEventListener('input', (e) => {
        mostrarProductos(e.target.value);
    });

    // Botón nuevo producto
    document.querySelector('.btn-nuevo-producto').addEventListener('click', mostrarModalNuevoProducto);

    // Botón guardar pedido
    document.getElementById('btn-guardar-pedido').addEventListener('click', guardarPedido);

    // Delegación de eventos para editar productos
    document.getElementById('productos-tbody').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-editar')) {
            const id = e.target.dataset.id;
            editarProducto(id);
        }
    });

    // Botón nuevo negocio en el header
    document.querySelector('.btn-new').addEventListener('click', mostrarModalNuevoNegocio);

    // Botón ver historial de pedidos
    document.getElementById('btn-historial-pedidos').addEventListener('click', mostrarHistorialPedidos);

    // Cerrar modales
    document.getElementById('btn-close-modal').addEventListener('click', () => {
        document.getElementById('modal-historial').style.display = 'none';
    });

    document.getElementById('btn-close-editar-modal').addEventListener('click', () => {
        document.getElementById('modal-editar-pedido').style.display = 'none';
    });

    // Agregar producto existente en edición
    document.querySelector('.btn-agregar-existente').addEventListener('click', agregarProductoExistenteEnEdicion);

    // Crear nuevo producto en edición
    document.querySelector('.btn-crear-nuevo').addEventListener('click', crearNuevoProductoEnEdicion);

    // Formulario de editar pedido
    document.getElementById('form-editar-pedido').addEventListener('submit', guardarCambiosPedido);

    // Cancelar edición
    document.getElementById('btn-cancelar-edicion').addEventListener('click', () => {
        document.getElementById('modal-editar-pedido').style.display = 'none';
    });
}

// Formatear entrada de moneda
function formatearMoneda(e) {
    let valor = e.target.value.replace(/[^\d]/g, '');
    if (valor) {
        valor = parseInt(valor).toLocaleString('es-CO');
        e.target.value = valor;
    }
}

// Guardar datos obligatorios
function guardarDatosObligatorios(e) {
    e.preventDefault();

    const fecha = document.getElementById('fecha-pedido').value;
    const persona = document.getElementById('persona-responsable').value;
    const valorTexto = document.getElementById('valor-efectivo').value;
    const valor = parseFloat(valorTexto.replace(/[^\d]/g, ''));

    if (!fecha || !persona || isNaN(valor) || valor <= 0) {
        alert('Por favor complete todos los campos correctamente.');
        return;
    }

    pedidoActual.fecha = fecha;
    pedidoActual.personaResponsable = persona;
    pedidoActual.valorEfectivo = valor;

    // Ocultar paso 1 y mostrar paso 2
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';

    alert('Datos obligatorios guardados. Ahora puede realizar el pedido.');
}

// Mostrar modal para nuevo producto
function mostrarModalNuevoProducto() {
    const nombre = prompt('Nombre del nuevo producto:');
    if (!nombre) return;

    const unidad = prompt('Unidad predeterminada:', 'Kg');
    if (!unidad) return;

    agregarProducto(nombre, unidad);
}

// Mostrar modal para nuevo negocio
function mostrarModalNuevoNegocio() {
    const nombre = prompt('Nombre del nuevo negocio:');
    if (!nombre) return;

    agregarNegocio(nombre);
}

// Agregar nuevo producto
async function agregarProducto(nombre, unidad) {
    try {
        await firebase.addDoc(window.productosRef, {
            nombre: nombre,
            unidad: unidad,
            activo: true
        });

        cargarProductos();
        alert('Producto agregado exitosamente a la base de datos.');
    } catch (error) {
        console.error('Error agregando producto:', error);
        alert('Error al agregar producto a la base de datos. Verifique la configuración de Firebase.');
    }
}

// Agregar nuevo negocio
async function agregarNegocio(nombre) {
    try {
        await firebase.addDoc(window.negociosRef, {
            nombre: nombre
        });

        cargarNegocios();
        alert('Negocio agregado exitosamente a la base de datos.');
    } catch (error) {
        console.error('Error agregando negocio:', error);
        alert('Error al agregar negocio a la base de datos. Verifique la configuración de Firebase.');
    }
}

// Editar producto
function editarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    const nuevoNombre = prompt('Nuevo nombre:', producto.nombre);
    if (!nuevoNombre) return;

    const nuevaUnidad = prompt('Nueva unidad:', producto.unidad);
    if (!nuevaUnidad) return;

    actualizarProducto(id, nuevoNombre, nuevaUnidad);
}

// Actualizar producto
async function actualizarProducto(id, nombre, unidad) {
    try {
        await firebase.updateDoc(firebase.doc(window.db, 'productos', id), {
            nombre: nombre,
            unidad: unidad
        });

        cargarProductos();
        alert('Producto actualizado exitosamente en la base de datos.');
    } catch (error) {
        console.error('Error actualizando producto:', error);
        alert('Error al actualizar producto en la base de datos. Verifique la configuración de Firebase.');
    }
}

// Verificar si hay productos con cantidad > 0 para habilitar el botón guardar
function verificarProductosPedido() {
    const filas = document.querySelectorAll('#productos-tbody tr');
    let hayProductos = false;

    filas.forEach(fila => {
        const cantidad = parseFloat(fila.querySelector('.cantidad-input').value) || 0;
        if (cantidad > 0) {
            hayProductos = true;
        }
    });

    const btnGuardar = document.getElementById('btn-guardar-pedido');
    btnGuardar.disabled = !hayProductos;
}

// Guardar pedido
async function guardarPedido() {
    // Recopilar productos del pedido
    const filas = document.querySelectorAll('#productos-tbody tr');
    const productosPedido = [];

    filas.forEach(fila => {
        const nombre = fila.cells[0].textContent;
        const unidad = fila.querySelector('.unidad-select').value;
        const cantidad = parseFloat(fila.querySelector('.cantidad-input').value) || 0;

        if (cantidad > 0) {
            productosPedido.push({
                nombre: nombre,
                unidad: unidad,
                cantidad: cantidad
            });
        }
    });

    if (productosPedido.length === 0) {
        alert('Debe agregar al menos un producto con cantidad mayor a 0.');
        return;
    }

    pedidoActual.productos = productosPedido;

    try {
        // Guardar pedido en colección de pedidos
        const pedidoData = {
            negocioId: negocioSeleccionado.id,
            negocioNombre: negocioSeleccionado.nombre,
            fecha: pedidoActual.fecha,
            personaResponsable: pedidoActual.personaResponsable,
            valorEfectivo: pedidoActual.valorEfectivo,
            productos: productosPedido,
            fechaCreacion: firebase.Timestamp.fromDate(new Date())
        };

        await firebase.addDoc(window.pedidosRef, pedidoData);

        const resumen = `
Pedido para ${negocioSeleccionado.nombre}
Fecha: ${pedidoActual.fecha}
Responsable: ${pedidoActual.personaResponsable}
Valor entregado: $${pedidoActual.valorEfectivo.toLocaleString('es-CO')}
Productos:
${productosPedido.map(p => `- ${p.nombre}: ${p.cantidad} ${p.unidad}`).join('\n')}
        `;

        alert('Pedido guardado exitosamente en la base de datos:\n\n' + resumen);

        // Resetear para nuevo pedido
        negocioSeleccionado = null;
        pedidoActual = { fecha: '', personaResponsable: '', valorEfectivo: 0, productos: [] };
        document.getElementById('pedido-module').style.display = 'none';
        document.querySelectorAll('.btn-negocio').forEach(btn => btn.classList.remove('active'));

    } catch (error) {
        console.error('Error guardando pedido:', error);
        alert('Error al guardar el pedido en la base de datos. Verifique la configuración de Firebase.');
    }
}

// Mostrar historial de pedidos
async function mostrarHistorialPedidos() {
    if (!negocioSeleccionado) {
        alert('Primero debe seleccionar un negocio.');
        return;
    }

    const modal = document.getElementById('modal-historial');
    const modalNegocioNombre = document.getElementById('modal-negocio-nombre');
    const historialList = document.getElementById('historial-pedidos-list');

    modalNegocioNombre.textContent = negocioSeleccionado.nombre;
    historialList.innerHTML = '<p>Cargando pedidos...</p>';
    modal.style.display = 'flex';

    // Configurar filtros de fecha
    const filtroInicio = document.getElementById('filtro-fecha-inicio');
    const filtroFin = document.getElementById('filtro-fecha-fin');
    const btnFiltrar = document.getElementById('btn-filtrar-historial');

    // Establecer fechas por defecto (último mes)
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(hoy.getMonth() - 1);

    filtroInicio.value = haceUnMes.toISOString().split('T')[0];
    filtroFin.value = hoy.toISOString().split('T')[0];

    // Event listener para filtrar
    btnFiltrar.addEventListener('click', () => {
        cargarHistorialPedidos(negocioSeleccionado.id, filtroInicio.value, filtroFin.value);
    });

    // Cargar pedidos del negocio
    cargarHistorialPedidos(negocioSeleccionado.id, filtroInicio.value, filtroFin.value);
}

// Cargar historial de pedidos con filtros
async function cargarHistorialPedidos(negocioId, fechaInicio, fechaFin) {
    try {
        const q = firebase.query(window.pedidosRef, firebase.where('negocioId', '==', negocioId));
        const querySnapshot = await firebase.getDocs(q);

        const historialList = document.getElementById('historial-pedidos-list');
        historialList.innerHTML = '';

        if (querySnapshot.empty) {
            historialList.innerHTML = '<p>No hay pedidos registrados para este negocio.</p>';
            return;
        }

        const pedidosFiltrados = [];

        querySnapshot.forEach((doc) => {
            const pedido = doc.data();
            const fechaPedido = pedido.fechaCreacion ? pedido.fechaCreacion.toDate() : new Date(pedido.fecha);
            const fechaInicioFiltro = new Date(fechaInicio);
            const fechaFinFiltro = new Date(fechaFin);

            // Ajustar fecha fin al final del día
            fechaFinFiltro.setHours(23, 59, 59, 999);

            if (fechaPedido >= fechaInicioFiltro && fechaPedido <= fechaFinFiltro) {
                pedidosFiltrados.push({ id: doc.id, ...pedido });
            }
        });

        if (pedidosFiltrados.length === 0) {
            historialList.innerHTML = '<p>No hay pedidos en el rango de fechas seleccionado.</p>';
            return;
        }

        // Ordenar por fecha descendente (más recientes primero)
        pedidosFiltrados.sort((a, b) => {
            const fechaA = a.fechaCreacion ? a.fechaCreacion.toDate() : new Date(a.fecha);
            const fechaB = b.fechaCreacion ? b.fechaCreacion.toDate() : new Date(b.fecha);
            return fechaB - fechaA;
        });

        pedidosFiltrados.forEach((pedido) => {
            const pedidoItem = document.createElement('div');
            pedidoItem.className = 'pedido-item';

            const fecha = pedido.fechaCreacion ? pedido.fechaCreacion.toDate().toLocaleDateString('es-CO') : pedido.fecha;

            pedidoItem.innerHTML = `
                <div class="pedido-header">
                    <span class="pedido-fecha">${fecha}</span>
                    <span class="pedido-responsable">${pedido.personaResponsable}</span>
                    <span class="pedido-valor">$${pedido.valorEfectivo.toLocaleString('es-CO')}</span>
                    <button class="btn-editar-pedido" data-id="${pedido.id}"><i class="fas fa-edit"></i> Editar</button>
                </div>
                <div class="pedido-productos">
                    <ul>
                        ${pedido.productos.map(p => `<li>${p.nombre}: ${p.cantidad} ${p.unidad}</li>`).join('')}
                    </ul>
                </div>
            `;

            historialList.appendChild(pedidoItem);
        });

        // Agregar event listeners a los botones de editar
        document.querySelectorAll('.btn-editar-pedido').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pedidoId = e.target.closest('.btn-editar-pedido').dataset.id;
                editarPedido(pedidoId);
            });
        });

    } catch (error) {
        console.error('Error cargando historial:', error);
        alert('Error al cargar el historial de pedidos.');
    }
}

// Editar pedido
async function editarPedido(pedidoId) {
    try {
        const docRef = firebase.doc(window.db, 'pedidos', pedidoId);
        const docSnap = await firebase.getDoc(docRef);

        if (docSnap.exists()) {
            const pedido = docSnap.data();

            // Llenar formulario de edición
            document.getElementById('editar-fecha').value = pedido.fecha;
            document.getElementById('editar-responsable').value = pedido.personaResponsable;
            document.getElementById('editar-valor').value = pedido.valorEfectivo.toLocaleString('es-CO');

            // Mostrar nombre del negocio en el modal
            document.getElementById('modal-editar-negocio').textContent = pedido.negocioNombre || 'Sin nombre';

            // Llenar productos
            const productosList = document.getElementById('productos-editar-list');
            productosList.innerHTML = '';

            if (pedido.productos && pedido.productos.length > 0) {
                pedido.productos.forEach((producto, index) => {
                    agregarProductoEnEdicion(producto.nombre, producto.unidad, producto.cantidad);
                });
            }

            // Cargar productos disponibles para el select
            await cargarProductosParaSelect();

            // Guardar ID del pedido para actualizar
            document.getElementById('form-editar-pedido').dataset.pedidoId = pedidoId;

            // Cerrar modal de historial y abrir modal de edición
            document.getElementById('modal-historial').style.display = 'none';
            document.getElementById('modal-editar-pedido').style.display = 'block';
        }
    } catch (error) {
        console.error('Error cargando pedido para editar:', error);
        alert('Error al cargar el pedido para editar.');
    }
}

// Cargar productos disponibles para el select
async function cargarProductosParaSelect() {
    try {
        const querySnapshot = await firebase.getDocs(window.productosRef);
        const select = document.getElementById('select-producto-existente');
        select.innerHTML = '<option value="">Seleccionar producto existente...</option>';

        querySnapshot.forEach((doc) => {
            const producto = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = producto.nombre;
            option.dataset.unidad = producto.unidad;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando productos para select:', error);
    }
}

// Agregar producto existente en edición
function agregarProductoExistenteEnEdicion() {
    const select = document.getElementById('select-producto-existente');
    const productoId = select.value;

    if (!productoId) {
        alert('Por favor selecciona un producto existente.');
        return;
    }

    const option = select.querySelector(`option[value="${productoId}"]`);
    const nombre = option.textContent;
    const unidad = option.dataset.unidad;

    agregarProductoEnEdicion(nombre, unidad, '');
    select.value = ''; // Resetear select
}

// Crear nuevo producto en edición
function crearNuevoProductoEnEdicion() {
    const nombre = prompt('Nombre del nuevo producto:');
    if (!nombre) return;

    const unidad = prompt('Unidad predeterminada:', 'Kg');
    if (!unidad) return;

    // Agregar a Firebase
    agregarProducto(nombre, unidad);

    // Agregar al pedido
    agregarProductoEnEdicion(nombre, unidad, '');
}

// Agregar producto en edición
function agregarProductoEnEdicion(nombre = '', unidad = 'Kg', cantidad = '') {
    const productosList = document.getElementById('productos-editar-list');
    const productoItem = document.createElement('div');
    productoItem.className = 'producto-editar-item';

    productoItem.innerHTML = `
        <input type="text" placeholder="Nombre del producto" value="${nombre}" required>
        <select required>
            ${unidades.map(u => `<option value="${u}" ${u === unidad ? 'selected' : ''}>${u}</option>`).join('')}
        </select>
        <input type="number" placeholder="Cantidad" min="0.1" step="0.1" value="${cantidad}" required>
        <button type="button" class="btn-remover-producto"><i class="fas fa-trash"></i></button>
    `;

    // Event listener para remover producto
    productoItem.querySelector('.btn-remover-producto').addEventListener('click', () => {
        productoItem.remove();
    });

    productosList.appendChild(productoItem);
}

// Guardar cambios del pedido
async function guardarCambiosPedido(e) {
    e.preventDefault();

    const pedidoId = e.target.dataset.pedidoId;
    const fecha = document.getElementById('editar-fecha').value;
    const responsable = document.getElementById('editar-responsable').value;
    const valorTexto = document.getElementById('editar-valor').value;
    const valor = parseFloat(valorTexto.replace(/[^\d]/g, ''));

    // Recopilar productos
    const productosItems = document.querySelectorAll('.producto-editar-item');
    const productos = [];

    productosItems.forEach(item => {
        const inputs = item.querySelectorAll('input, select');
        const nombre = inputs[0].value;
        const unidad = inputs[1].value;
        const cantidad = parseFloat(inputs[2].value);

        if (nombre && unidad && cantidad > 0) {
            productos.push({ nombre, unidad, cantidad });
        }
    });

    if (productos.length === 0) {
        alert('Debe incluir al menos un producto.');
        return;
    }

    try {
        await firebase.updateDoc(firebase.doc(window.db, 'pedidos', pedidoId), {
            fecha: fecha,
            personaResponsable: responsable,
            valorEfectivo: valor,
            productos: productos,
            fechaActualizacion: firebase.Timestamp.fromDate(new Date())
        });

        alert('Pedido actualizado exitosamente.');
        document.getElementById('modal-editar-pedido').style.display = 'none';

        // Recargar historial si está abierto
        if (document.getElementById('modal-historial').style.display === 'block') {
            mostrarHistorialPedidos();
        }

    } catch (error) {
        console.error('Error actualizando pedido:', error);
        alert('Error al actualizar el pedido.');
    }
}