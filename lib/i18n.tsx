'use client';
import { createContext, useContext, type ReactNode } from 'react';

/**
 * The site's locales. Each locale is a static route (`/`, `/es/`, `/zh-Hans/`) rendered at build time, so a locale
 * needs no server: the pages differ only in the words and the `lang` attribute. The picker switches route and
 * remembers the choice (`vibecad.locale`); a country domain can point at any of them (site.json's domains).
 *
 * Every string a visitor reads in the studio shell goes through `t`. The studio's deep panels are still English in
 * es and zh-Hans, which is listed in the repository's next steps; the shell and the first page are translated.
 */
export type Locale = 'en' | 'es' | 'zh-Hans';

export const LOCALES: { locale: Locale; label: string; path: string; lang: string; name: string }[] = [
    { locale: 'en', label: 'A', path: '/', lang: 'en', name: 'English' },
    { locale: 'es', label: 'ES', path: '/es/', lang: 'es', name: 'Español' },
    { locale: 'zh-Hans', label: '文', path: '/zh-Hans/', lang: 'zh-Hans', name: '简体中文' },
];

const messages: Record<Locale, Record<string, string>> = {
    en: {
        'brand.edition': 'IDEAS. IN EVERY DIMENSION.',
        'nav.aria': 'Workspace',
        'nav.explore': 'Explore',
        'nav.studio': 'Studio',
        'nav.circuits': 'Circuits',
        'gallery.aria': 'Explore objects',
        'gallery.overline': 'MEET VIBECAD. MAKE SENSE OF THINGS.',
        'gallery.title.first': 'See what’s inside.',
        'gallery.title.second': 'Shape what’s next.',
        'gallery.sub': 'Explore every part. Understand every connection. Describe a change. See a new possibility.',
        'gallery.form.label': 'What shall we explore?',
        'gallery.form.placeholder': 'A camera. A coffee grinder. Your next idea…',
        'gallery.form.create': 'Create device',
        'gallery.unavailable': 'the model is unavailable',
        'gallery.continue': 'Explore {name}',
        'gallery.real': 'Start with real parts.',
        'gallery.real.detail': 'Browse sourced CAD components and 3D reference models',
        'gallery.pause': 'Pause motion',
        'gallery.play': 'Play opening',
        'gallery.caption.live': 'LIVE, EXPLORABLE ASSEMBLY',
        'gallery.caption.progress': 'YOUR CUSTOM ASSEMBLY · IN PROGRESS',
        'gallery.caption.current': 'YOUR CURRENT ASSEMBLY',
        'gallery.receiving': '{count} custom components received',
        'gallery.receiving.aria': 'Components received from the model',
        'gallery.receiving.checked': 'The complete assembly is checked before it opens.',
        'gallery.parts.pending': '{count} components received · final checks pending',
        'gallery.parts.count': '{count} individual components · drag to look around',
        'gallery.parts.saved': '{count} individual components · your saved object',
        'gallery.collection': 'GOOD PLACES TO START',
        'gallery.card.corne.kicker': '01 / GROUNDED DESIGN',
        'gallery.card.corne.title': 'Same case. New possibility.',
        'gallery.card.corne.meta': 'Corne · source CAD',
        'gallery.card.corne.open': 'Open the design study',
        'gallery.card.desktop.kicker': '02 / SYSTEMS',
        'gallery.card.desktop.title': 'A whole world. Inside the case.',
        'gallery.card.desktop.meta': 'Desktop computer',
        'gallery.card.desktop.open': 'Explore a real KiCad board',
        'gallery.card.import.kicker': '03 / YOUR CURIOSITY',
        'gallery.card.import.title': 'Bring something of your own.',
        'gallery.card.import.meta': 'Import a GLB or saved project',
        'gallery.card.import.open': 'Open your model or saved project',
        'chat.kicker': 'A CONVERSATION WITH YOUR OBJECT',
        'chat.title': 'Every part has a purpose.',
        'chat.sub': 'Answers point to real parts in this scene. Describe a change to edit the assembly.',
        'ask.placeholder': 'Ask your object anything. Or give it a new idea…',
        'ask.placeholder.part': 'Ask about {name}…',
        'ask.edit': 'Edit',
        'ask.cancel': 'Cancel',
        'ask.aria': 'Ask about or edit the device',
        'library.title': 'A world of building blocks',
        'library.sub': 'Start with something real. Make it something yours.',
        'picker.aria': 'Language',
    },
    es: {
        'brand.edition': 'IDEAS. EN TODAS LAS DIMENSIONES.',
        'nav.aria': 'Espacio de trabajo',
        'nav.explore': 'Explorar',
        'nav.studio': 'Estudio',
        'nav.circuits': 'Circuitos',
        'gallery.aria': 'Explorar objetos',
        'gallery.overline': 'CONOCE VIBECAD. ENTENDER LAS COSAS.',
        'gallery.title.first': 'Mira lo que hay dentro.',
        'gallery.title.second': 'Da forma a lo que viene.',
        'gallery.sub': 'Explora cada pieza. Entiende cada conexión. Describe un cambio. Mira una nueva posibilidad.',
        'gallery.form.label': '¿Qué exploramos?',
        'gallery.form.placeholder': 'Una cámara. Un molinillo de café. Tu próxima idea…',
        'gallery.form.create': 'Crear objeto',
        'gallery.unavailable': 'el modelo no está disponible',
        'gallery.continue': 'Explorar {name}',
        'gallery.real': 'Empieza con piezas reales.',
        'gallery.real.detail': 'Explora componentes CAD con fuente y modelos 3D de referencia',
        'gallery.pause': 'Pausar el movimiento',
        'gallery.play': 'Reproducir la apertura',
        'gallery.caption.live': 'CONJUNTO EN VIVO, EXPLORABLE',
        'gallery.caption.progress': 'TU CONJUNTO PERSONALIZADO · EN CURSO',
        'gallery.caption.current': 'TU CONJUNTO ACTUAL',
        'gallery.receiving': '{count} componentes personalizados recibidos',
        'gallery.receiving.aria': 'Componentes recibidos del modelo',
        'gallery.receiving.checked': 'El conjunto completo se comprueba antes de abrirse.',
        'gallery.parts.pending': '{count} componentes recibidos · comprobaciones finales pendientes',
        'gallery.parts.count': '{count} componentes individuales · arrastra para mirar alrededor',
        'gallery.parts.saved': '{count} componentes individuales · tu objeto guardado',
        'gallery.collection': 'BUENOS PUNTOS DE PARTIDA',
        'gallery.card.corne.kicker': '01 / DISEÑO CON BASE',
        'gallery.card.corne.title': 'Misma caja. Nueva posibilidad.',
        'gallery.card.corne.meta': 'Corne · CAD de origen',
        'gallery.card.corne.open': 'Abrir el estudio de diseño',
        'gallery.card.desktop.kicker': '02 / SISTEMAS',
        'gallery.card.desktop.title': 'Todo un mundo. Dentro de la caja.',
        'gallery.card.desktop.meta': 'Ordenador de sobremesa',
        'gallery.card.desktop.open': 'Explorar una placa KiCad real',
        'gallery.card.import.kicker': '03 / TU CURIOSIDAD',
        'gallery.card.import.title': 'Trae algo tuyo.',
        'gallery.card.import.meta': 'Importa un GLB o un proyecto guardado',
        'gallery.card.import.open': 'Abrir tu modelo o proyecto guardado',
        'chat.kicker': 'UNA CONVERSACIÓN CON TU OBJETO',
        'chat.title': 'Cada pieza tiene un propósito.',
        'chat.sub': 'Las respuestas señalan piezas reales de la escena. Describe un cambio para editar el conjunto.',
        'ask.placeholder': 'Pregunta lo que quieras a tu objeto. O dale una idea nueva…',
        'ask.placeholder.part': 'Pregunta sobre {name}…',
        'ask.edit': 'Editar',
        'ask.cancel': 'Cancelar',
        'ask.aria': 'Preguntar o editar el objeto',
        'library.title': 'Un mundo de piezas',
        'library.sub': 'Empieza con algo real. Hazlo tuyo.',
        'picker.aria': 'Idioma',
    },
    'zh-Hans': {
        'brand.edition': '想法，在每一个维度。',
        'nav.aria': '工作区',
        'nav.explore': '探索',
        'nav.studio': '工作台',
        'nav.circuits': '电路',
        'gallery.aria': '探索物体',
        'gallery.overline': '认识 VIBECAD。看懂身边的东西。',
        'gallery.title.first': '看见里面。',
        'gallery.title.second': '塑造下一步。',
        'gallery.sub': '探索每一个零件。理解每一处连接。描述一个改动。看见新的可能。',
        'gallery.form.label': '我们探索什么？',
        'gallery.form.placeholder': '一台相机。一台磨豆机。你的下一个想法……',
        'gallery.form.create': '创建物体',
        'gallery.unavailable': '模型暂不可用',
        'gallery.continue': '探索 {name}',
        'gallery.real': '从真实零件开始。',
        'gallery.real.detail': '浏览有出处的 CAD 零件与三维参考模型',
        'gallery.pause': '暂停运动',
        'gallery.play': '播放开合',
        'gallery.caption.live': '可实时探索的装配',
        'gallery.caption.progress': '你的自定义装配 · 进行中',
        'gallery.caption.current': '你当前的装配',
        'gallery.receiving': '已收到 {count} 个自定义零件',
        'gallery.receiving.aria': '模型返回的零件',
        'gallery.receiving.checked': '完整装配在打开前会经过检查。',
        'gallery.parts.pending': '已收到 {count} 个零件 · 正在做最后检查',
        'gallery.parts.count': '{count} 个独立零件 · 拖动查看四周',
        'gallery.parts.saved': '{count} 个独立零件 · 你保存的物体',
        'gallery.collection': '不错的起点',
        'gallery.card.corne.kicker': '01 / 有依据的设计',
        'gallery.card.corne.title': '同一个外壳。新的可能。',
        'gallery.card.corne.meta': 'Corne · 原始 CAD',
        'gallery.card.corne.open': '打开设计研究',
        'gallery.card.desktop.kicker': '02 / 系统',
        'gallery.card.desktop.title': '整个世界。装进外壳里。',
        'gallery.card.desktop.meta': '台式电脑',
        'gallery.card.desktop.open': '探索真实的 KiCad 电路板',
        'gallery.card.import.kicker': '03 / 你的好奇',
        'gallery.card.import.title': '带来你自己的东西。',
        'gallery.card.import.meta': '导入 GLB 或已保存的项目',
        'gallery.card.import.open': '打开你的模型或已保存的项目',
        'chat.kicker': '与你的物体对话',
        'chat.title': '每个零件都有作用。',
        'chat.sub': '回答会指向场景中的真实零件。描述一个改动来编辑装配。',
        'ask.placeholder': '向你的物体提问，或给它一个新想法……',
        'ask.placeholder.part': '询问关于{name}的问题……',
        'ask.edit': '编辑',
        'ask.cancel': '取消',
        'ask.aria': '询问或编辑这个物体',
        'library.title': '零件的世界',
        'library.sub': '从真实的东西开始。把它变成你的。',
        'picker.aria': '语言',
    },
};

const LocaleContext = createContext<Locale>('en');

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
    return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() { return useContext(LocaleContext); }

/** `t('gallery.continue', { name: 'Camera' })` — a missing key falls back to English, never to the key. */
export function useT() {
    const locale = useContext(LocaleContext);
    return (key: string, values?: Record<string, string | number>) => {
        const template = messages[locale][key] ?? messages.en[key] ?? key;
        return values ? template.replace(/\{(\w+)\}/g, (whole, name) => (name in values ? String(values[name]) : whole)) : template;
    };
}

export function messagesFor(locale: Locale) { return messages[locale]; }
