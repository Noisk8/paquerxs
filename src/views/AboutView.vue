<template>
  <article class="max-w-3xl mx-auto">
    <h1 class="text-3xl font-bold mb-2 text-stone-800 dark:text-stone-100">Pacas Digestoras</h1>
    <p class="text-stone-500 dark:text-stone-400 text-lg mt-0">Sistema de descontaminacion ecologica de residuos organicos</p>

    <section class="mt-8 space-y-6 text-stone-700 dark:text-stone-300 leading-relaxed">
      <p>
        La <strong>Paca Digestora Silva (PDS)</strong> es una biotecnologia limpia, ecologicamente eficiente,
        desarrollada hace mas de 20 anos por el tecnologo forestal <strong>Guillermo Silva</strong>.
        Consiste en un metodo de compostaje anaerobico que fermenta la materia organica a traves del
        prensado manual de los residuos, favoreciendo el cultivo de microorganismos anaerobios que
        facilitan la descomposicion sin generar contaminacion.
      </p>

      <h2 class="text-2xl font-bold mt-8 text-stone-800 dark:text-stone-100">Como funciona?</h2>
      <p>
        Se construye un molde de un metro cubico donde se colocan ramas, material de poda y hojarasca
        como base. En el centro se depositan los residuos organicos del hogar (maximo 40 kg por capa).
        Todo se comprime pisandolo para crear un ambiente <strong>anoxico</strong> (sin oxigeno), lo que
        evita los malos olores, roedores y moscas. Tras 6 a 8 meses, la paca se transforma en
        <strong>150 kg de abono organico</strong> que nutre el suelo y las plantas.
      </p>

      <h2 class="text-2xl font-bold mt-8 text-stone-800 dark:text-stone-100">Que es Paquerxs Teusaquillo?</h2>
      <p>
        <strong>Paquerxs Bogota</strong> es un grupo de colectivos ciudadanos custodios de la Paca
        Digestora Silva en Bogota-Region. Son una red de gestores del ambiente sano que cubren
        <strong>6 nodos, 15 localidades, mas de 51 barrios y mas de 100 pacas</strong> en toda la ciudad.
      </p>
      <p>
        En la localidad de <strong>Teusaquillo</strong>, varios colectivos se organizan para realizar
        pacas digestoras en espacios publicos, principalmente en parques. Esta herramienta no solo
        transforma residuos, sino que genera <strong>tejido comunitario</strong>, encuentra intergeneracional
        y promueve la conciencia ambiental.
      </p>

      <h2 class="text-2xl font-bold mt-8 text-stone-800 dark:text-stone-100">Colectivos</h2>
      <ul class="list-disc pl-6 space-y-2">
        <li><strong>Paquerxs del Parkway</strong> — Parque de la 26, zona norte</li>
        <li><strong>Paquerxs de San Luis</strong> — Parque San Luis, Campin y Galerias</li>
        <li><strong>Paquerxs del Neuque</strong> — Parque Teusaquillo, La Magdalena</li>
        <li><strong>Paquerxs de La Marchita</strong> — Zona sur de Teusaquillo</li>
        <li><strong>Paquerxs Armenia</strong> — Barrio Armenia, Teusaquillo</li>
      </ul>

      <h2 class="text-2xl font-bold mt-8 text-stone-800 dark:text-stone-100">Impacto</h2>
      <p>
        Hasta noviembre de 2023, se reporta que las pacas digestoras han procesado en Bogota
        cerca de <strong>13.000 toneladas de residuos organicos</strong>. El Jardin Botanico de Bogota
        investigo la inocuidad del proceso y confirmo que el abono generado cumple con la Norma
        Tecnica Colombiana 5167 para productos organicos.
      </p>
      <p>
        Esta tecnologia ha trascendido fronteras: hay registro de pacas digestoras en
        <strong>Mexico, Espana, Argentina y Uruguay</strong>.
      </p>

      <h2 class="text-2xl font-bold mt-8 text-stone-800 dark:text-stone-100">Esta aplicacion</h2>
      <p>
        Este proyecto es desarrollado por <strong>Wikimedia Colombia</strong> como parte de las
        iniciativas de la comunidad para fortalecer el conocimiento abierto y la accion ambiental.
        Esta herramienta web permite a los participantes de las pacas registrar datos sobre
        cada paca: ubicacion geografica, peso, fecha de creacion, colectivo responsable y
        participantes. Los datos se visualizan en un mapa interactivo para monitorear la
        red de pacas digestoras en Teusaquillo.
      </p>
      <p>
        Los datos se almacenan en <strong>ToolsDB</strong> (MariaDB) y la aplicacion esta construida
        con <strong>Vue.js + Express</strong>, desplegada en
        <a href="https://toolforge.org" target="_blank" rel="noopener noreferrer" class="text-[#2b5740] dark:text-[#5dd4be] hover:underline">Wikimedia Toolforge</a>.
      </p>

      <div class="mt-8 p-4 bg-[#ffcd6e]/10 dark:bg-[#ffcd6e]/5 rounded-xl border border-[#ffcd6e]/30 dark:border-[#ffcd6e]/15 text-sm">
        <p class="m-0">
          <strong>Fuentes:</strong>
          <a href="https://colombianidadur.wixsite.com/paquerxsbogota" target="_blank" rel="noopener noreferrer" class="text-[#2b5740] dark:text-[#68c67c] hover:underline">Paquerxs Bogota</a> ·
          <a href="https://es.wikipedia.org/wiki/Paca_Digestora_Silva" target="_blank" rel="noopener noreferrer" class="text-[#2b5740] dark:text-[#68c67c] hover:underline">Wikipedia</a> ·
          <a href="https://paquerxs-teusaquillo.wikibase.cloud/" target="_blank" rel="noopener noreferrer" class="text-[#2b5740] dark:text-[#68c67c] hover:underline">Wikibase Paquerxs</a>
        </p>
      </div>
    </section>
  </article>
</template>
