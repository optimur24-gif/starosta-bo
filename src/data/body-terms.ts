import type { BodyLandmark, BodyPart } from "../lib/body-model";

// Russian teaching translations; Latin fields retain the source TA2 terms.
const terms: Record<string, string> = Object.fromEntries(
  `
Abdominal part of pectoralis major muscle|Брюшная часть большой грудной мышцы
Abductor digiti minimi of foot|Мышца, отводящая мизинец стопы
Abductor digiti minimi of hand|Мышца, отводящая мизинец кисти
Abductor hallucis|Мышца, отводящая большой палец стопы
Abductor pollicis brevis|Короткая мышца, отводящая большой палец кисти
Abductor pollicis longus|Длинная мышца, отводящая большой палец кисти
Acromial part of deltoid muscle|Акромиальная часть дельтовидной мышцы
Adductor brevis|Короткая приводящая мышца
Adductor longus|Длинная приводящая мышца
Adductor magnus|Большая приводящая мышца
Adductor minimus|Малая приводящая мышца
Anconeus muscle|Локтевая мышца
Anterior belly of digastric muscle|Переднее брюшко двубрюшной мышцы
Ary-epiglottic part of oblique arytenoid muscle|Черпалонадгортанная часть косой черпаловидной мышцы
Ascending part of trapezius muscle|Восходящая часть трапециевидной мышцы
Brachialis muscle|Плечевая мышца
Brachioradialis muscle|Плечелучевая мышца
Bucinator|Щёчная мышца
Calcaneal tendon|Пяточное сухожилие
Clavicular head of pectoralis major muscle|Ключичная головка большой грудной мышцы
Clavicular part of deltoid muscle|Ключичная часть дельтовидной мышцы
Coccygeus muscle|Копчиковая мышца
Common tendinous ring|Общее сухожильное кольцо
Coracobrachialis muscle|Клювовидно-плечевая мышца
Corrugator supercilii|Мышца, сморщивающая бровь
Deep head of flexor pollicis brevis|Глубокая головка короткого сгибателя большого пальца кисти
Deep head of pronator teres|Глубокая головка круглого пронатора
Deep part of masseter|Глубокая часть жевательной мышцы
Depressor anguli oris|Мышца, опускающая угол рта
Depressor labii inferioris|Мышца, опускающая нижнюю губу
Depressor septi nasi|Мышца, опускающая перегородку носа
Descending part of trapezius muscle|Нисходящая часть трапециевидной мышцы
Diaphragm|Диафрагма
Dorsal interossei muscles of foot|Тыльные межкостные мышцы стопы
Dorsal interossei muscles of hand|Тыльные межкостные мышцы кисти
Dorsal parts of lateral intertransversarii lumborum muscles|Дорсальные части латеральных межпоперечных мышц поясницы
Epicranial aponeurosis|Надчерепной апоневроз
Extensor carpi radialis brevis|Короткий лучевой разгибатель запястья
Extensor carpi radialis longus|Длинный лучевой разгибатель запястья
Extensor digiti minimi|Разгибатель мизинца
Extensor digitorum|Разгибатель пальцев кисти
Extensor digitorum brevis|Короткий разгибатель пальцев стопы
Extensor digitorum longus|Длинный разгибатель пальцев стопы
Extensor hallucis brevis|Короткий разгибатель большого пальца стопы
Extensor hallucis longus|Длинный разгибатель большого пальца стопы
Extensor indicis|Разгибатель указательного пальца
Extensor pollicis brevis|Короткий разгибатель большого пальца кисти
Extensor pollicis longus|Длинный разгибатель большого пальца кисти
Extensor retinaculum of wrist|Удерживатель разгибателей запястья
External abdominal oblique muscle|Наружная косая мышца живота
External anal sphincter|Наружный сфинктер заднего прохода
External intercostal muscles|Наружные межрёберные мышцы
External part of thyro-arytenoid muscle|Наружная часть щиточерпаловидной мышцы
Fibularis brevis muscle|Короткая малоберцовая мышца
Fibularis longus muscle|Длинная малоберцовая мышца
Fibularis tertius muscle|Третья малоберцовая мышца
Flexor carpi radialis|Лучевой сгибатель запястья
Flexor digiti minimi of foot|Короткий сгибатель мизинца стопы
Flexor digiti minimi of hand|Короткий сгибатель мизинца кисти
Flexor digitorum brevis|Короткий сгибатель пальцев стопы
Flexor digitorum longus|Длинный сгибатель пальцев стопы
Flexor digitorum profundus|Глубокий сгибатель пальцев кисти
Flexor hallucis longus|Длинный сгибатель большого пальца стопы
Flexor pollicis longus|Длинный сгибатель большого пальца кисти
Flexor retinaculum of ankle|Удерживатель сгибателей голеностопа
Flexor retinaculum of wrist|Удерживатель сгибателей запястья
Frontalis muscle|Лобная мышца
Genioglossus muscle|Подбородочно-язычная мышца
Geniohyoid muscle|Подбородочно-подъязычная мышца
Gluteus maximus muscle|Большая ягодичная мышца
Gluteus medius muscle|Средняя ягодичная мышца
Gluteus minimus muscle|Малая ягодичная мышца
Gracilis muscle|Тонкая мышца
Humeral head of extensor carpi ulnaris|Плечевая головка локтевого разгибателя запястья
Humeral head of flexor carpi ulnaris|Плечевая головка локтевого сгибателя запястья
Humero-ulnar head of flexor digitorum superficialis|Плечелоктевая головка поверхностного сгибателя пальцев
Hyoglossus muscle|Подъязычно-язычная мышца
Iliacus muscle|Подвздошная мышца
Iliococcygeus muscle|Подвздошно-копчиковая мышца
Iliocostalis colli muscle|Подвздошно-рёберная мышца шеи
Iliocostalis lumborum muscle|Подвздошно-рёберная мышца поясницы
Iliocostalis thoracis muscle|Подвздошно-рёберная мышца груди
Iliotibial tract|Подвздошно-большеберцовый тракт
Inferior extensor retinaculum of ankle|Нижний удерживатель разгибателей голеностопа
Inferior fibular retinaculum|Нижний удерживатель малоберцовых мышц
Inferior gemellus muscle|Нижняя близнецовая мышца
Inferior head of lateral pterygoid muscle|Нижняя головка латеральной крыловидной мышцы
Inferior oblique muscle|Нижняя косая мышца глазного яблока
Inferior pharyngeal constrictor|Нижний констриктор глотки
Inferior rectus muscle|Нижняя прямая мышца глазного яблока
Inferior tarsus|Нижняя пластинка века
Infraspinatus muscle|Подостная мышца
Inguinal ligament|Паховая связка
Innermost intercostal muscles|Самые внутренние межрёберные мышцы
Intermediate tendon of digastric muscle|Промежуточное сухожилие двубрюшной мышцы
Internal abdominal oblique muscle|Внутренняя косая мышца живота
Internal intercostal muscles|Внутренние межрёберные мышцы
Interspinales colli muscles|Межостистые мышцы шеи
Interspinales lumborum muscles|Межостистые мышцы поясницы
Interspinales thoracis muscles|Межостистые мышцы груди
Lateral crico-arytenoid muscle|Латеральная перстнечерпаловидная мышца
Lateral head of flexor hallucis brevis|Латеральная головка короткого сгибателя большого пальца стопы
Lateral head of gastrocnemius|Латеральная головка икроножной мышцы
Lateral head of triceps brachii|Латеральная головка трёхглавой мышцы плеча
Lateral patellar retinaculum|Латеральная удерживающая связка надколенника
Lateral rectus muscle|Латеральная прямая мышца глазного яблока
Latissimus dorsi muscle|Широчайшая мышца спины
Levator anguli oris|Мышца, поднимающая угол рта
Levator labii superioris|Мышца, поднимающая верхнюю губу
Levator nasolabialis|Мышца, поднимающая верхнюю губу и крыло носа
Levator palpebrae superioris|Мышца, поднимающая верхнее веко
Levator scapulae|Мышца, поднимающая лопатку
Levatores breves costarum|Короткие мышцы, поднимающие рёбра
Levatores longi costarum|Длинные мышцы, поднимающие рёбра
Linea alba|Белая линия живота
Long head of biceps brachii|Длинная головка двуглавой мышцы плеча
Long head of biceps femoris|Длинная головка двуглавой мышцы бедра
Long head of triceps brachii|Длинная головка трёхглавой мышцы плеча
Longissimus capitis muscle|Длиннейшая мышца головы
Longissimus colli muscle|Длиннейшая мышца шеи
Longissimus thoracis muscle|Длиннейшая мышца груди
Longus capitis muscle|Длинная мышца головы
Longus colli muscle|Длинная мышца шеи
Lumbrical muscles of foot|Червеобразные мышцы стопы
Lumbrical muscles of hand|Червеобразные мышцы кисти
Medial head of flexor hallucis brevis|Медиальная головка короткого сгибателя большого пальца стопы
Medial head of gastrocnemius|Медиальная головка икроножной мышцы
Medial head of triceps brachii|Медиальная головка трёхглавой мышцы плеча
Medial patellar retinaculum|Медиальная удерживающая связка надколенника
Medial pterygoid muscle|Медиальная крыловидная мышца
Medial rectus muscle|Медиальная прямая мышца глазного яблока
Mentalis muscle|Подбородочная мышца
Middle pharyngeal constrictor|Средний констриктор глотки
Multifidus colli muscle|Многораздельная мышца шеи
Multifidus lumborum muscle|Многораздельная мышца поясницы
Multifidus thoracis muscle|Многораздельная мышца груди
Mylohyoid muscle|Челюстно-подъязычная мышца
Nasalis muscle|Носовая мышца
Oblique head of adductor hallucis|Косая головка мышцы, приводящей большой палец стопы
Oblique head of adductor pollicis|Косая головка мышцы, приводящей большой палец кисти
Oblique part of cricothyroid muscle|Косая часть перстнещитовидной мышцы
Obliquus inferior capitis muscle|Нижняя косая мышца головы
Obliquus superior capitis muscle|Верхняя косая мышца головы
Obturator externus|Наружная запирательная мышца
Obturator internus|Внутренняя запирательная мышца
Occipitalis muscle|Затылочная мышца
Omohyoid muscle|Лопаточно-подъязычная мышца
Opponens digiti minimi muscle of foot|Мышца, противопоставляющая мизинец стопы
Opponens digiti minimi muscle of hand|Мышца, противопоставляющая мизинец кисти
Opponens pollicis muscle|Мышца, противопоставляющая большой палец кисти
Orbicularis oris muscle|Круговая мышца рта
Orbital part of orbicularis oculi|Глазничная часть круговой мышцы глаза
Palatopharyngeus muscle|Нёбно-глоточная мышца
Palmar interossei muscles|Ладонные межкостные мышцы
Palmaris longus muscle|Длинная ладонная мышца
Palpebral part of orbicularis oculi|Вековая часть круговой мышцы глаза
Pectineus muscle|Гребенчатая мышца
Pectoralis minor muscle|Малая грудная мышца
Piriformis muscle|Грушевидная мышца
Plantar aponeurosis|Подошвенный апоневроз
Plantar interossei muscles|Подошвенные межкостные мышцы
Plantaris muscle|Подошвенная мышца
Platysma|Подкожная мышца шеи
Popliteus muscle|Подколенная мышца
Posterior belly of digastric muscle|Заднее брюшко двубрюшной мышцы
Posterior crico-arytenoid muscle|Задняя перстнечерпаловидная мышца
Procerus muscle|Мышца гордецов
Pronator quadratus|Квадратный пронатор
Psoas major|Большая поясничная мышца
Pubo-analis muscle|Лобково-анальная мышца
Pubococcygeus muscle|Лобково-копчиковая мышца
Pyramidalis muscle|Пирамидальная мышца
Quadratus femoris muscle|Квадратная мышца бедра
Quadratus lumborum muscle|Квадратная мышца поясницы
Quadratus plantae muscle|Квадратная мышца подошвы
Radial head of flexor digitorum superficialis|Лучевая головка поверхностного сгибателя пальцев
Rectus abdominis muscle|Прямая мышца живота
Rectus anterior capitis muscle|Передняя прямая мышца головы
Rectus femoris muscle|Прямая мышца бедра
Rectus lateralis capitis muscle|Латеральная прямая мышца головы
Rectus posterior major capitis muscle|Большая задняя прямая мышца головы
Rectus posterior minor capitis muscle|Малая задняя прямая мышца головы
Rhomboid major muscle|Большая ромбовидная мышца
Rhomboid minor muscle|Малая ромбовидная мышца
Risorius muscle|Мышца смеха
Rotatores|Мышцы-вращатели
Sartorius muscle|Портняжная мышца
Scalenus anterior muscle|Передняя лестничная мышца
Scalenus medius muscle|Средняя лестничная мышца
Scalenus posterior muscle|Задняя лестничная мышца
Scapular spinal part of deltoid muscle|Остистая часть дельтовидной мышцы
Semimembranosus muscle|Полуперепончатая мышца
Semispinalis colli muscle|Полуостистая мышца шеи
Semispinalis thoracis muscle|Полуостистая мышца груди
Semitendinosus muscle|Полусухожильная мышца
Serratus anterior muscle|Передняя зубчатая мышца
Serratus posterior inferior muscle|Нижняя задняя зубчатая мышца
Serratus posterior superior muscle|Верхняя задняя зубчатая мышца
Short head of biceps brachii|Короткая головка двуглавой мышцы плеча
Short head of biceps femoris|Короткая головка двуглавой мышцы бедра
Soleus muscle|Камбаловидная мышца
Spinalis capitis muscle|Остистая мышца головы
Spinalis colli muscle|Остистая мышца шеи
Spinalis thoracis muscle|Остистая мышца груди
Splenius capitis muscle|Ременная мышца головы
Splenius colli muscle|Ременная мышца шеи
Sternocleidomastoid muscle|Грудино-ключично-сосцевидная мышца
Sternocostal head of pectoralis major muscle|Грудино-рёберная головка большой грудной мышцы
Sternohyoid muscle|Грудино-подъязычная мышца
Sternothyroid muscle|Грудино-щитовидная мышца
Straight part of cricothyroid muscle|Прямая часть перстнещитовидной мышцы
Stylohyoid muscle|Шилоподъязычная мышца
Stylopharyngeus muscle|Шилоглоточная мышца
Subclavius muscle|Подключичная мышца
Subscapularis muscle|Подлопаточная мышца
Superficial head of flexor pollicis brevis|Поверхностная головка короткого сгибателя большого пальца кисти
Superficial head of pronator teres|Поверхностная головка круглого пронатора
Superficial part of masseter|Поверхностная часть жевательной мышцы
Superficial transverse metacarpal ligament|Поверхностная поперечная пястная связка
Superficial transverse metatarsal ligament|Поверхностная поперечная плюсневая связка
Superior extensor retinaculum of ankle|Верхний удерживатель разгибателей голеностопа
Superior fibular retinaculum|Верхний удерживатель малоберцовых мышц
Superior gemellus muscle|Верхняя близнецовая мышца
Superior head of lateral pterygoid muscle|Верхняя головка латеральной крыловидной мышцы
Superior oblique muscle|Верхняя косая мышца глазного яблока
Superior pharyngeal constrictor|Верхний констриктор глотки
Superior rectus muscle|Верхняя прямая мышца глазного яблока
Superior tarsus|Верхняя пластинка века
Supinator|Супинатор
Supraspinatus muscle|Надостная мышца
Temporalis muscle|Височная мышца
Temporoparietalis muscle|Височно-теменная мышца
Tendinous arch of levator ani|Сухожильная дуга мышцы, поднимающей задний проход
Tendon of extensor digitorum longus|Сухожилие длинного разгибателя пальцев стопы
Tensor fasciae latae|Мышца, напрягающая широкую фасцию бедра
Teres major muscle|Большая круглая мышца
Teres minor muscle|Малая круглая мышца
Thyro-epiglottic part of thyro-arytenoid muscle|Щитонадгортанная часть щиточерпаловидной мышцы
Thyrohyoid muscle|Щитоподъязычная мышца
Tibialis anterior muscle|Передняя большеберцовая мышца
Tibialis posterior muscle|Задняя большеберцовая мышца
Transverse arytenoid muscle|Поперечная черпаловидная мышца
Transverse head of adductor hallucis|Поперечная головка мышцы, приводящей большой палец стопы
Transverse head of adductor pollicis|Поперечная головка мышцы, приводящей большой палец кисти
Transverse part of trapezius muscle|Поперечная часть трапециевидной мышцы
Transversus abdominis muscle|Поперечная мышца живота
Transversus thoracis muscle|Поперечная мышца груди
Trochlea of superior oblique muscle|Блок верхней косой мышцы
Ulnar head of extensor carpi ulnaris|Локтевая головка локтевого разгибателя запястья
Ulnar head of flexor carpi ulnaris|Локтевая головка локтевого сгибателя запястья
Vastus intermedius muscle|Промежуточная широкая мышца бедра
Vastus lateralis muscle|Латеральная широкая мышца бедра
Vastus medialis muscle|Медиальная широкая мышца бедра
Ventral parts of lateral intertransversarii lumborum muscles|Вентральные части латеральных межпоперечных мышц поясницы
Zygomaticus major muscle|Большая скуловая мышца
Zygomaticus minor muscle|Малая скуловая мышца
Femur|Бедренная кость
Humerus|Плечевая кость
Radius|Лучевая кость
Ulna|Локтевая кость
Tibia|Большеберцовая кость
Fibula|Малоберцовая кость
Patella|Надколенник
Scapula|Лопатка
Clavicle|Ключица
Hip bone|Тазовая кость
Sacrum|Крестец
Coccyx|Копчик
Atlas (C1)|Атлант (C1)
Axis (C2)|Осевой позвонок (C2)
Manubrium of sternum|Рукоятка грудины
Body of sternum|Тело грудины
Xiphoid process|Мечевидный отросток
Talus|Таранная кость
Calcaneus|Пяточная кость
Navicular bone|Ладьевидная кость стопы
Cuboid bone|Кубовидная кость
Intermediate cuneiform bone|Промежуточная клиновидная кость
Lateral cuneiform bone|Латеральная клиновидная кость
Medial cuneiform bone|Медиальная клиновидная кость
Capitate bone|Головчатая кость
Hamate bone|Крючковидная кость
Lunate bone|Полулунная кость
Pisiform bone|Гороховидная кость
Scaphoid bone|Ладьевидная кость кисти
Trapezium bone|Кость-трапеция
Trapezoid bone|Трапециевидная кость
Triquetrum bone|Трёхгранная кость
Sesamoid bones of foot|Сесамовидные кости стопы
Frontal bone|Лобная кость
Parietal bone|Теменная кость
Temporal bone|Височная кость
Occipital bone|Затылочная кость
Sphenoid bone|Клиновидная кость
Ethmoid bone|Решётчатая кость
Inferior nasal concha bone|Нижняя носовая раковина
Lacrimal bone|Слёзная кость
Nasal bone|Носовая кость
Maxilla|Верхняя челюсть
Palatine bone|Нёбная кость
Zygomatic bone|Скуловая кость
Mandible|Нижняя челюсть
Vomer|Сошник
Hyoid bone|Подъязычная кость
Malleus|Молоточек
Incus|Наковальня
Stapes|Стремечко
`
    .trim()
    .split("\n")
    .map((row) => row.split("|")),
);

Object.assign(
  terms,
  Object.fromEntries(
    `
Acromioclavicular ligament|Акромиально-ключичная связка
Annular ligament of radius|Кольцевая связка лучевой кости
Anterior cruciate ligament|Передняя крестообразная связка
Anterior ligament of fibular head|Передняя связка головки малоберцовой кости
Anterior longitudinal ligament|Передняя продольная связка
Anterior meniscotibial ligament (Lateral meniscus)|Передняя менискобольшеберцовая связка латерального мениска
Anterior meniscotibial ligament (Medial meniscus)|Передняя менискобольшеберцовая связка медиального мениска
Anterior sacro-iliac ligament|Передняя крестцово-подвздошная связка
Anterior sternoclavicular ligament|Передняя грудино-ключичная связка
Anterior talocalcaneal ligament|Передняя таранно-пяточная связка
Anterior tibiofibular ligament|Передняя межберцовая связка
Arcuate popliteal ligament|Дугообразная подколенная связка
Calcaneocuboid ligament|Пяточно-кубовидная связка
Calcaneonavicular ligament|Пяточно-ладьевидная связка
Collateral interphalangeal ligaments of foot|Коллатеральные связки межфаланговых суставов стопы
Collateral interphalangeal ligaments of hand|Коллатеральные связки межфаланговых суставов кисти
Collateral metacarpophalangeal ligaments|Коллатеральные связки пястно-фаланговых суставов
Collateral metatarsophalangeal ligaments|Коллатеральные связки плюснефаланговых суставов
Coracohumeral ligament|Клювовидно-плечевая связка
Costotransverse ligament|Рёберно-поперечная связка
Cricopharyngeal ligament|Перстнеглоточная связка
Cuneocuboid interosseous ligament|Межкостная клинокубовидная связка
Cuneometatarsal interosseous ligaments|Межкостные клиноплюсневые связки
Deep part of tibial collateral ligament|Глубокая часть большеберцовой коллатеральной связки
Deep transverse metacarpal ligament|Глубокая поперечная пястная связка
Deep transverse metatarsal ligament|Глубокая поперечная плюсневая связка
Descending part of iliofemoral ligament|Нисходящая часть подвздошно-бедренной связки
Dorsal carpometacarpal ligaments|Тыльные запястно-пястные связки
Dorsal cuneonavicular ligaments|Тыльные клиноладьевидные связки
Dorsal intercarpal ligaments|Тыльные межзапястные связки
Dorsal metacarpal ligaments|Тыльные пястные связки
Dorsal metatarsal ligaments|Тыльные плюсневые связки
Dorsal radiocarpal ligament|Тыльная лучезапястная связка
Dorsal scaphotriquetral ligament|Тыльная ладьевидно-трёхгранная связка
Dorsal tarsometatarsal ligaments|Тыльные предплюсне-плюсневые связки
Dorsal ulnocarpal ligament|Тыльная локтезапястная связка
Fibular collateral ligament|Малоберцовая коллатеральная связка
Iliolumbar ligament|Подвздошно-поясничная связка
Inferior glenohumeral ligament|Нижняя суставно-плечевая связка
Inferior pubic ligament|Нижняя лобковая связка
Interclavicular ligament|Межключичная связка
Interosseous membrane of forearm|Межкостная перепонка предплечья
Interosseous membrane of leg|Межкостная перепонка голени
Interosseous metacarpal ligaments|Межкостные пястные связки
Interosseous sacro-iliac ligament|Межкостная крестцово-подвздошная связка
Intersesamoid ligament|Межсесамовидная связка
Interspinous ligaments|Межостистые связки
Intra-articular ligament of head of rib|Внутрисуставная связка головки ребра
Ischiofemoral ligament|Седалищно-бедренная связка
Lateral temporomandibular ligament|Латеральная связка височно-нижнечелюстного сустава
Lateral thyrohyoid ligament|Латеральная щитоподъязычная связка
Ligament of head of femur|Связка головки бедренной кости
Ligamenta flava|Жёлтые связки
Long plantar ligament|Длинная подошвенная связка
Medial talocalcaneal ligament|Медиальная таранно-пяточная связка
Median cricothyroid ligament|Срединная перстнещитовидная связка
Median thyrohyoid ligament|Срединная щитоподъязычная связка
Meniscopatellar ligament|Менисконадколенниковая связка
Metatarsal interosseous ligaments|Межкостные плюсневые связки
Middle glenohumeral ligament|Средняя суставно-плечевая связка
Nuchal ligament|Выйная связка
Oblique popliteal ligament|Косая подколенная связка
Palmar carpometacarpal ligaments|Ладонные запястно-пястные связки
Palmar interphalangeal ligaments|Ладонные связки межфаланговых суставов
Palmar metacarpal ligaments|Ладонные пястные связки
Palmar radio-ulnar ligament|Ладонная лучелоктевая связка
Palmar scaphotriquetral ligament|Ладонная ладьевидно-трёхгранная связка
Pisotriquetral ligament|Гороховидно-трёхгранная связка
Plantar calcaneocuboid ligament|Подошвенная пяточно-кубовидная связка
Plantar cuneocuboid ligament|Подошвенная клинокубовидная связка
Plantar cuneonavicular ligaments|Подошвенные клиноладьевидные связки
Plantar interphalangeal ligaments|Подошвенные связки межфаланговых суставов
Plantar metatarsal ligaments|Подошвенные плюсневые связки
Plantar metatarsophalangeal ligaments|Подошвенные связки плюснефаланговых суставов
Plantar tarsometatarsal ligaments|Подошвенные предплюсне-плюсневые связки
Popliteofibular ligament|Подколенно-малоберцовая связка
Posterior cruciate ligament|Задняя крестообразная связка
Posterior ligament of fibular head|Задняя связка головки малоберцовой кости
Posterior longitudinal ligament|Задняя продольная связка
Posterior meniscotibial ligament (Lateral meniscus)|Задняя менискобольшеберцовая связка латерального мениска
Posterior meniscotibial ligament (Medial meniscus)|Задняя менискобольшеберцовая связка медиального мениска
Posterior sacro-iliac ligament|Задняя крестцово-подвздошная связка
Posterior sternoclavicular ligament|Задняя грудино-ключичная связка
Posterior talocalcaneal ligament|Задняя таранно-пяточная связка
Posterior tibiofibular ligament|Задняя межберцовая связка
Pubofemoral ligament|Лобково-бедренная связка
Radial collateral ligament|Лучевая коллатеральная связка
Radial collateral ligament of wrist joint|Лучевая коллатеральная связка запястья
Radiate carpal ligament|Лучистая связка запястья
Radiate ligament of head of rib|Лучистая связка головки ребра
Sacrospinous ligament|Крестцово-остистая связка
Sacrotuberous ligament|Крестцово-бугорная связка
Scaphotrapeziotrapezoidal ligament|Ладьевидно-трапециотрапециевидная связка
Sphenomandibular ligament|Клиновидно-нижнечелюстная связка
Stylohyoid ligament|Шилоподъязычная связка
Stylomandibular ligament|Шилонижнечелюстная связка
Superficial part of tibial collateral ligament|Поверхностная часть большеберцовой коллатеральной связки
Superior glenohumeral ligament|Верхняя суставно-плечевая связка
Superior pubic ligament|Верхняя лобковая связка
Supraspinous ligament|Надостистая связка
Talocalcaneal interosseous ligament|Межкостная таранно-пяточная связка
Talonavicular ligament|Таранно-ладьевидная связка
Tibionavicular ligament|Большеберцово-ладьевидная связка
Transverse acetabular ligament|Поперечная связка вертлужной впадины
Transverse humeral ligament|Поперечная связка плечевой кости
Transverse ligament of knee|Поперечная связка колена
Transverse part of iliofemoral ligament|Поперечная часть подвздошно-бедренной связки
Transverse tibiofibular ligament|Поперечная межберцовая связка
Ulnar collateral ligament|Локтевая коллатеральная связка
Ulnar collateral ligament of wrist joint|Локтевая коллатеральная связка запястья
Ulnocapitate ligament|Локтеголовчатая связка
Ulnolunate ligament|Локтеполулунная связка
Acromial end|Акромиальный конец
Acromial facet|Акромиальная суставная поверхность
Anterior bony ampulla|Передняя костная ампула
Anterior clinoid process|Передний наклонённый отросток
Anterior limb of stapes|Передняя ножка стремечка
Anterior process of calcaneus|Передний отросток пяточной кости
Anterior process of malleus|Передний отросток молоточка
Anterior semicircular canal|Передний полукружный канал
Apex of coccyx|Верхушка копчика
Articular facet for malleus|Суставная поверхность для молоточка
Articular facet for stapes|Суставная поверхность для стремечка
Articular facet of head of malleus|Суставная поверхность головки молоточка
Articular facet of head of stapes|Суставная поверхность головки стремечка
Articular surface for cuboid|Суставная поверхность для кубовидной кости
Base of coccyx|Основание копчика
Base of cochlea|Основание улитки
Base of mandible|Основание нижней челюсти
Base of stapes|Основание стремечка
Basilar part of occipital bone|Базилярная часть затылочной кости
Body of clavicle|Тело ключицы
Body of hyoid bone|Тело подъязычной кости
Body of incus|Тело наковальни
Body of mandible|Тело нижней челюсти
Body of sphenoid bone|Тело клиновидной кости
Body of talus|Тело таранной кости
Calcaneal sulcus|Борозда пяточной кости
Calcaneal tubercle|Пяточный бугорок
Calcaneal tuberosity|Пяточный бугор
Carotid sulcus|Сонная борозда
Cerebellar fossa|Мозжечковая ямка
Cerebral fossa|Мозговая ямка
Cerebral surface of greater wing|Мозговая поверхность большого крыла
Chiasmatic sulcus|Борозда перекрёста
Clavicular notch|Ключичная вырезка
Coccygeal horn|Копчиковый рог
Cochlear cupula|Купол улитки
Common bony limb|Общая костная ножка
Condylar canal|Мыщелковый канал
Condylar fossa|Мыщелковая ямка
Conoid tubercle|Конусовидный бугорок
Cruciform eminence|Крестообразное возвышение
Digastric fossa|Двубрюшная ямка
Dorsum sellae|Спинка седла
Ethmoidal notch|Решётчатая вырезка
External occipital crest|Наружный затылочный гребень
External occipital protuberance|Наружный затылочный выступ
External surface of frontal bone|Наружная поверхность лобной кости
Facet for calcaneonavicular part of bifurcate ligament|Площадка для пяточно-ладьевидной части раздвоенной связки
Facet for plantar calcaneonavicular ligament|Площадка для подошвенной пяточно-ладьевидной связки
Foramen caecum of frontal bone|Слепое отверстие лобной кости
Foramen ovale|Овальное отверстие
Foramen rotundum|Круглое отверстие
Foramen spinosum|Остистое отверстие
Fossa for lacrimal gland|Ямка слёзной железы
Frontal crest|Лобный гребень
Frontal eminence|Лобный бугор
Frontal margin of greater wing|Лобный край большого крыла
Frontal part of orbital margin|Лобная часть глазничного края
Genion|Генион
Glabella|Надпереносье
Gnathion|Гнатион
Greater horn of hyoid bone|Большой рог подъязычной кости
Greater wing|Большое крыло
Groove for marginal sinus|Борозда краевого синуса
Groove for occipital sinus|Борозда затылочного синуса
Groove for subclavius muscle|Борозда подключичной мышцы
Groove for tendon of fibularis longus muscle of cuboid bone|Борозда сухожилия длинной малоберцовой мышцы кубовидной кости
Groove for tendon of flexor hallucis longus of calcaneus|Борозда сухожилия длинного сгибателя большого пальца стопы на пяточной кости
Groove for tendon of flexor hallucis longus of talus|Борозда сухожилия длинного сгибателя большого пальца стопы на таранной кости
Groove for transverse sinus|Борозда поперечного синуса
Groove of pterygoid hamulus|Борозда крыловидного крючка
Handle of malleus|Рукоятка молоточка
Head of malleus|Головка молоточка
Head of talus|Головка таранной кости
Hypoglossal canal|Подъязычный канал
Hypophysial fossa|Гипофизарная ямка
Impression for costoclavicular ligament|Вдавление рёберно-ключичной связки
Inferior mental spine|Нижняя подбородочная ость
Inferior nuchal line|Нижняя выйная линия
Infratemporal surface of greater wing|Подвисочная поверхность большого крыла
Internal occipital crest|Внутренний затылочный гребень
Internal occipital protuberance|Внутренний затылочный выступ
Internal surface of squamous part of frontal bone|Внутренняя поверхность чешуи лобной кости
Intrajugular process of occipital bone|Внутрияремный отросток затылочной кости
Jugular notch of occipital bone|Яремная вырезка затылочной кости
Jugular process|Яремный отросток
Lateral bony ampulla|Латеральная костная ампула
Lateral malleolar facet|Латеральная лодыжковая поверхность
Lateral part of occipital bone|Латеральная часть затылочной кости
Lateral process of calcaneal tuberosity|Латеральный отросток пяточного бугра
Lateral process of malleus|Латеральный отросток молоточка
Lateral process of talus|Латеральный отросток таранной кости
Lateral pterygoid plate|Латеральная пластинка крыловидного отростка
Lateral semicircular canal|Латеральный полукружный канал
Lateral tubercle|Латеральный бугорок
Lenticular process of incus|Чечевицеобразный отросток наковальни
Lesser horn of hyoid bone|Малый рог подъязычной кости
Lesser wing|Малое крыло
Limbus of sphenoid|Клиновидный лимб
Long limb of incus|Длинная ножка наковальни
Mandibular dental arch|Нижняя зубная дуга
Mandibular symphysis|Симфиз нижней челюсти
Mastoid border of occipital bone|Сосцевидный край затылочной кости
Maxillary dental arch|Верхняя зубная дуга
Maxillary surface of greater wing|Верхнечелюстная поверхность большого крыла
Medial malleolar facet|Медиальная лодыжковая поверхность
Medial process of calcaneal tuberosity|Медиальный отросток пяточного бугра
Medial pterygoid plate|Медиальная пластинка крыловидного отростка
Medial tubercle|Медиальный бугорок
Mental foramen|Подбородочное отверстие
Mental protuberance|Подбородочный выступ
Mental tubercle|Подбородочный бугорок
Middle clinoid process|Средний наклонённый отросток
Middle facet for calcaneus|Средняя пяточная суставная поверхность
Mylohyoid line|Челюстно-подъязычная линия
Nasal margin of frontal bone|Носовой край лобной кости
Nasal part of frontal bone|Носовая часть лобной кости
Nasal spine of frontal bone|Носовая ость лобной кости
Navicular articular surface|Ладьевидная суставная поверхность
Neck of malleus|Шейка молоточка
Neck of talus|Шейка таранной кости
Oblique line of mandible|Косая линия нижней челюсти
Occipital condyle|Затылочный мыщелок
Occipital plane|Затылочная площадка
Opening of frontal sinus|Апертура лобной пазухи
Optic canal|Зрительный канал
Orbital part of frontal bone|Глазничная часть лобной кости
Orbital plate of frontal bone|Глазничная пластинка лобной кости
Orbital surface of frontal bone|Глазничная поверхность лобной кости
Orbital surface of greater wing|Глазничная поверхность большого крыла
Parietal margin of frontal bone|Теменной край лобной кости
Parietal margin of greater wing|Теменной край большого крыла
Pharyngeal tubercle|Глоточный бугорок
Posterior bony ampulla|Задняя костная ампула
Posterior calcaneal articular facet|Задняя пяточная суставная поверхность
Posterior clinoid process|Задний наклонённый отросток
Posterior limb of stapes|Задняя ножка стремечка
Posterior process of talus|Задний отросток таранной кости
Posterior semicircular canal|Задний полукружный канал
Pterygoid canal|Крыловидный канал
Pterygoid fossa|Крыловидная ямка
Pterygoid hamulus|Крыловидный крючок
Pterygoid notch|Крыловидная вырезка
Pterygoid process|Крыловидный отросток
Pterygospinous process|Крылоостистый отросток
Scaphoid fossa|Ладьевидная ямка
Sella turcica|Турецкое седло
Septum of frontal sinuses|Перегородка лобных пазух
Septum of sphenoidal sinuses|Перегородка клиновидных пазух
Simple bony limb|Простая костная ножка
Sphenoidal crest|Клиновидный гребень
Sphenoidal lingula|Клиновидный язычок
Sphenoidal margin of frontal bone|Клиновидный край лобной кости
Sphenoidal yoke|Клиновидное возвышение
Spine of sphenoid bone|Ость клиновидной кости
Spiral canal of cochlea|Спиральный канал улитки
Squamosal margin of greater wing|Чешуйчатый край большого крыла
Squamous part of frontal bone|Чешуя лобной кости
Squamous part of occipital bone|Чешуя затылочной кости
Sternal articular surface|Грудинная суставная поверхность
Sternal end|Грудинный конец
Sublingual fossa|Подъязычная ямка
Sulcus of auditory tube|Борозда слуховой трубы
Supercilliary arch|Надбровная дуга
Superior facet of talus|Верхняя суставная поверхность таранной кости
Superior mental spine|Верхняя подбородочная ость
Superior nuchal line|Верхняя выйная линия
Supra-orbital notch|Надглазничная вырезка
Supreme nuchal line|Наивысшая выйная линия
Sustentaculum tali|Опора таранной кости
Talar sulcus|Борозда таранной кости
Tarsal sinus|Пазуха предплюсны
Temporal line|Височная линия
Temporal surface of frontal bone|Височная поверхность лобной кости
Temporal surface of greater wing|Височная поверхность большого крыла
Trapezoid line|Трапециевидная линия
Trochlea of talus|Блок таранной кости
Trochlear fovea|Блоковая ямка
Tuberculum sellae|Бугорок седла
Tuberosity for coracoclavicular ligament|Бугристость клювовидно-ключичной связки
Tuberosity of cuboid bone|Бугристость кубовидной кости
Tuberosity of navicular bone|Бугристость ладьевидной кости
Vaginal process of sphenoid bone|Влагалищный отросток клиновидной кости
Vermian fossa|Ямка червя
Zygomatic margin of greater wing|Скуловой край большого крыла
Zygomatic process of frontal bone|Скуловой отросток лобной кости
[Trochlear spine]|Блоковая ость (вариант)
`
      .trim()
      .split("\n")
      .map((row) => row.split("|")),
  ),
);

const ordinals: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
};
const roman = [
  "",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];
const boneLatin: Record<string, string> = {
  "Atlas (C1)": "Atlas",
  "Axis (C2)": "Axis",
  "Sesamoid bones of foot": "Ossa sesamoidea pedis",
};

function generated(name: string): { ru: string; la: string } | null {
  let match = name.match(
    /^(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth) rib$/i,
  );
  if (match) {
    const n = ordinals[match[1].toLowerCase()];
    return { ru: `${roman[n]} ребро`, la: `Costa ${roman[n]}` };
  }
  match = name.match(/^Vertebra ([CTL])(\d+)$/);
  if (match) {
    const n = Number(match[2]);
    const section = {
      C: ["шейный", "cervicalis"],
      T: ["грудной", "thoracica"],
      L: ["поясничный", "lumbalis"],
    }[match[1]]!;
    return {
      ru: `${roman[n]} ${section[0]} позвонок`,
      la: `Vertebra ${section[1]} ${roman[n]}`,
    };
  }
  match = name.match(
    /^(First|Second|Third|Fourth|Fifth) (metacarpal|metatarsal) bone$/,
  );
  if (match) {
    const n = ordinals[match[1].toLowerCase()];
    return {
      ru: `${roman[n]} ${match[2] === "metacarpal" ? "пястная" : "плюсневая"} кость`,
      la: `Os ${match[2] === "metacarpal" ? "metacarpale" : "metatarsale"} ${roman[n]}`,
    };
  }
  match = name.match(
    /^(Distal|Middle|Proximal) phalanx of (first|second|third|fourth|fifth) finger of (hand|foot)$/,
  );
  if (match) {
    const n = ordinals[match[2]];
    const segment = {
      Distal: ["Дистальная", "distalis"],
      Middle: ["Средняя", "media"],
      Proximal: ["Проксимальная", "proximalis"],
    }[match[1]]!;
    return {
      ru: `${segment[0]} фаланга ${roman[n]} пальца ${match[3] === "hand" ? "кисти" : "стопы"}`,
      la: `Phalanx ${segment[1]} digiti ${roman[n]} ${match[3] === "hand" ? "manus" : "pedis"}`,
    };
  }
  return null;
}

export function russianName(
  part: Pick<BodyPart, "name"> | Pick<BodyLandmark, "name">,
): string | null {
  return terms[part.name.trim()] || generated(part.name.trim())?.ru || null;
}
export function latinName(
  part: Pick<BodyPart, "name" | "latin"> | Pick<BodyLandmark, "name" | "latin">,
): string | null {
  return part.latin || generated(part.name)?.la || boneLatin[part.name] || null;
}
export function bodyName(part: BodyPart, includeSide = true): string {
  const name = russianName(part) || part.name;
  return includeSide && part.side
    ? `${name} · ${part.side === "left" ? "слева" : "справа"}`
    : name;
}
export const bodyKindNames: Record<string, string> = {
  bone: "Кость",
  muscle: "Мышца",
  ligament: "Связка",
  joint: "Суставная структура",
  tooth: "Зуб",
  connective: "Сухожилие или соединительная структура",
  zone: "Зона прикрепления",
};
