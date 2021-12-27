const { insertIntoNew, select, insertInto, selectById } = require('../db')

const categoryType = {
  laptopsPKAndSoft: 'Компьютеры, ноутбуки и ПО',
  accessoriesPK: 'Комплектующие для ПК',
  // peripheralsAndAccessories: 'Периферия и аксессуары',
}

const subCategoryType = {
  personalComputers: 'Персональные компьютеры',
  laptops: 'Ноутбуки',
  // software: 'Программное обеспечение',
  processors: 'Процессоры',
  motherboards: 'Материнские платы',
  videoCards: 'Видеокарты',
  RAM: 'Оперативная память',
  enclosures: 'Корпуса',
  SSDDrives: 'SSD накопители',
  hardDrives: 'Жесткие диски',
  // monitors: 'Мониторы',
  // keyboards: 'Клавиатуры',
  // mouses: 'Мыши',
  // mousePads: 'Коврики для мыши',
  // webcams: 'Веб-камеры',
  // headphones: 'Наушники',
}

// const getDataEntrys = async (keyMatches, entryArr) => {
//   const newEntrys = []
//   for (const entry of entryArr) {
//     newEntrys.push({})
//     for (const [key, value] of Object.entries(entry)) {
//       if (keyMatches && keyMatches[key] && keyMatches[key].table) {
//         const foreignTwoKey = keyMatches[key].key
//         value = await select(table, '(id)', `${foreignTwoKey} = ${value}`).rows[0].id
//       }
//       newEntrys[key] = value
//     }
//   }
//   return newEntrys
// }

// const categories = Object.values(categoryType)

// const subcategories = [

// ]

class Controller {
  constructor(table, keyName) {
    this.table = table
    this.keyName = keyName
    this.condFunc = (value) =>
      `${this.keyName} = ${typeof value === 'string' ? `\'${value}\'` : value}`
  }

  async insertSimple(names, cond_func) {
    const querys = []
    for (const name of names) {
      const data = { [this.keyName]: name }
      const query = !cond_func
        ? await insertInto(this.table, data)
        : await insertIntoNew(this.table, cond_func(name), data)
      querys.push(query)
    }
    return querys
  }

  async insertSimpleNew(names) {
    return await this.insertSimple(names, this.condFunc)
  }

  async insert(keys, valuesArr, cond_func) {
    const querys = []
    let nameIndex
    if (cond_func) {
      nameIndex = 0
      keys.forEach((key, i) => {
        if (this.keyName === key) {
          nameIndex = i
        }
      })
    }
    for (const values of valuesArr) {
      const data = {}
      values.forEach((value, index) => {
        data[keys[index]] = value
      })
      const query =
        typeof nameIndex !== 'number'
          ? await insertInto(this.table, data)
          : await insertIntoNew(this.table, cond_func(values[nameIndex]), data)
      querys.push(query)
    }
    return querys
  }

  async insertNew(keys, valuesArr) {
    return await this.insert(keys, valuesArr, this.condFunc)
  }

  async getIdByName(name) {
    const query = await select(this.table, '(id)', this.condFunc(name))
    return query.rowCount > 0 ? query.rows[0].id : null
  }
}

class ControllerWithIds extends Controller {
  constructor(table, keyName, entries) {
    super(table, keyName)
    this.entries = entries
    this.keys = Object.keys(this.entries)
  }

  async insert(valuesArr, cond_func) {
    const updValuesArr = []
    for (const values of valuesArr) {
      updValuesArr.push([])
      for (let i = 0; i < values.length; i++) {
        let value = values[i]
        value =
          this.entries[this.keys[i]] !== '' && typeof value === 'string'
            ? await this.entries[this.keys[i]].getIdByName(value)
            : value
        updValuesArr[updValuesArr.length - 1].push(value)
      }
    }
    await super.insert(this.keys, updValuesArr, cond_func)
  }

  async insertNew(valuesArr) {
    return await this.insert(valuesArr, this.condFunc)
  }
}

const controllers = {
  categories: new Controller('categories', 'category_name'),
  measurementUnits: new Controller(
    'measurement_units',
    'measurement_unit_name'
  ),
  dataTypes: new Controller('data_types', 'data_type_name'),
  subcategories: null,
  propertyTypes: null,
}

controllers.subcategories = new ControllerWithIds(
  'subcategories',
  'subcategory_name',
  {
    subcategory_name: '',
    category_id: controllers.categories,
  }
)

controllers.propertyTypes = new ControllerWithIds(
  'property_types',
  'property_name',
  {
    property_name: '',
    measurement_unit_id: controllers.measurementUnits,
    data_type_id: controllers.dataTypes,
    subcategory_id: controllers.subcategories,
  }
)

const queryDictionaries = async () => {
  await controllers.categories.insertSimpleNew(Object.values(categoryType))
  await controllers.measurementUnits.insertSimpleNew([
    'мес.',
    'МГц',
    'МБ',
    'ГБ',
    'ТБ',
    'Гбит/с',
    'мм',
    "''",
    'Гц',
    'ppi',
    'Кд/м²',
    '%',
    'Мп',
    'Вт*ч',
    'ч',
    'Вт',
    'кг',
    'г',
    '°',
    'Мбайт/сек',
    'об/мин',
    '',
  ])
  await controllers.dataTypes.insertSimpleNew([
    'string',
    'integer',
    'real',
    'boolean',
  ])

  await controllers.subcategories.insertNew([
    [subCategoryType.personalComputers, categoryType.laptopsPKAndSoft],
    [subCategoryType.laptops, categoryType.laptopsPKAndSoft],
    [subCategoryType.processors, categoryType.accessoriesPK],
    [subCategoryType.motherboards, categoryType.accessoriesPK],
    [subCategoryType.videoCards, categoryType.accessoriesPK],
    [subCategoryType.RAM, categoryType.accessoriesPK],
    [subCategoryType.enclosures, categoryType.accessoriesPK],
    [subCategoryType.SSDDrives, categoryType.accessoriesPK],
    [subCategoryType.hardDrives, categoryType.accessoriesPK],
  ])

  await controllers.propertyTypes.insertNew([
    ['ПК: Гарантия', 'мес.', 'integer', subCategoryType.personalComputers],
    ['Линейка', '', 'string', subCategoryType.personalComputers],
    ['Форм-фактор корпуса', '', 'string', subCategoryType.personalComputers],
    [
      'ПК: Основной цвет корпуса',
      '',
      'string',

      subCategoryType.personalComputers,
    ],
    ['Операционная система', '', 'string', subCategoryType.personalComputers],
    ['Модель процессора', '', 'string', subCategoryType.personalComputers],
    [
      'Количество ядер процессора',
      '',
      'integer',

      subCategoryType.personalComputers,
    ],
    ['Частота процессора', 'МГц', 'integer', subCategoryType.personalComputers],
    [
      'Сокет материнской платы',
      '',
      'string',

      subCategoryType.personalComputers,
    ],
    [
      'Общее количество слотов оперативной памяти',
      '',
      'integer',

      subCategoryType.personalComputers,
    ],
    [
      'Общий объем оперативной памяти',
      'ГБ',
      'integer',

      subCategoryType.personalComputers,
    ],
    ['Тип видеокарты', '', 'string', subCategoryType.personalComputers],
    ['Модель видеокарты', '', 'string', subCategoryType.personalComputers],
    [
      'Конфигурация накопителей',
      '',
      'string',

      subCategoryType.personalComputers,
    ],
    ['ПК Габариты: длина', 'мм', 'integer', subCategoryType.personalComputers],
    ['ПК Габариты: ширина', 'мм', 'integer', subCategoryType.personalComputers],
    ['ПК Габариты: высота', 'мм', 'integer', subCategoryType.personalComputers],
  ])

  await controllers.propertyTypes.insertNew([
    ['Ноутбук: Гарантия', 'мес.', 'integer', subCategoryType.laptops],
    ['Модель ноутбука', '', 'string', subCategoryType.laptops],
    ['Операционная система ноутбука', '', 'string', subCategoryType.laptops],
    ['Конструктивное исполнение', '', 'string', subCategoryType.laptops],
    ['Подсветка клавиш', '', 'boolean', subCategoryType.laptops],
    ['Диагональ экрана (дюйм)', "''", 'real', subCategoryType.laptops],
    ['Разрешение экрана', '', 'string', subCategoryType.laptops],
    [
      'Максимальная частота обновления экрана',
      'Гц',
      'integer',

      subCategoryType.laptops,
    ],
    ['Плотность пикселей', 'ppi', 'integer', subCategoryType.laptops],
    ['Производитель процессора', '', 'string', subCategoryType.laptops],
    ['Линейка процессора', '', 'string', subCategoryType.laptops],
    [
      'Количество ядер процессора ноутбука',
      '',
      'integer',

      subCategoryType.laptops,
    ],
    ['Максимальное число потоков', '', 'integer', subCategoryType.laptops],
    ['Объем оперативной памяти', 'ГБ', 'integer', subCategoryType.laptops],
    [
      'Максимальный объем оперативной памяти',
      'ГБ',
      'integer',

      subCategoryType.laptops,
    ],
    ['Вид графического ускорителя', '', 'string', subCategoryType.laptops],
    [
      'Общий объем твердотельных накопителей (SSD)',
      'ГБ',
      'integer',

      subCategoryType.laptops,
    ],
    [
      'Общий объем жестких дисков (HDD)',
      'ГБ',
      'integer',

      subCategoryType.laptops,
    ],
    ['Веб-камера', 'Мп', 'integer', subCategoryType.laptops],
    ['Порт Ethernet', 'Гбит/с', 'string', subCategoryType.laptops],
    ['Емкость аккумулятора', 'Вт*ч', 'integer', subCategoryType.laptops],
    [
      'Приблизительное время автономной работы',
      'ч',
      'integer',

      subCategoryType.laptops,
    ],
    [
      'Выходная мощность адаптера питания',
      'Вт',
      'integer',

      subCategoryType.laptops,
    ],
    ['Ноутбук Габариты: Глубина', 'мм', 'integer', subCategoryType.laptops],
    ['Ноутбук Габариты: Ширина', 'мм', 'integer', subCategoryType.laptops],
    ['Ноутбук Габариты: Толщина', 'мм', 'real', subCategoryType.laptops],
    ['Вес ноутбука', 'кг', 'real', subCategoryType.laptops],
  ])

  await controllers.propertyTypes.insertNew([
    ['Процессор: Гарантия', 'мес.', 'integer', subCategoryType.processors],
    [
      'Процессор: Страна-производитель',
      '',
      'string',

      subCategoryType.processors,
    ],
    ['Процессор: Модель', '', 'string', subCategoryType.processors],
    ['Сокет', '', 'string', subCategoryType.processors],
    [
      'Количество производительных ядер',
      '',
      'integer',

      subCategoryType.processors,
    ],
    [
      'Процессор: Максимальное число потоков',
      '',
      'integer',

      subCategoryType.processors,
    ],
    [
      'Базовая частота процессора',
      'МГц',
      'integer',

      subCategoryType.processors,
    ],
    [
      'Максимально поддерживаемый объем памяти',
      'ГБ',
      'integer',

      subCategoryType.processors,
    ],
    [
      'Поддержка 64-битного набора команд',
      '',
      'string',

      subCategoryType.processors,
    ],
  ])

  await controllers.propertyTypes.insertNew([
    [
      'Материнская плата: Гарантия',
      'мес.',
      'integer',

      subCategoryType.motherboards,
    ],
    [
      'Материнская плата: Страна-производитель',
      '',
      'string',

      subCategoryType.motherboards,
    ],
    ['Модель материнской платы', '', 'string', subCategoryType.motherboards],
    ['Форм-фактор', '', 'string', subCategoryType.motherboards],
    ['Сокет процессора', '', 'string', subCategoryType.motherboards],
    ['Чипсет', '', 'string', subCategoryType.motherboards],
    ['Количество слотов памяти', '', 'integer', subCategoryType.motherboards],
    [
      'Максимальный объем памяти',
      'ГБ',
      'integer',

      subCategoryType.motherboards,
    ],
    [
      'Тип и количество портов SATA',
      '',
      'string',

      subCategoryType.motherboards,
    ],
    [
      'Материнская плата: Версия PCI Express',
      '',
      'string',

      subCategoryType.motherboards,
    ],
    ['Звук', '', 'string', subCategoryType.motherboards],
    ['Чипсет сетевого адаптера', '', 'string', subCategoryType.motherboards],
  ])

  await controllers.propertyTypes.insertNew([
    ['Видеокарта: Гарантия', 'мес.', 'integer', subCategoryType.videoCards],
    [
      'Видеокарта: Страна-производитель',
      '',
      'string',

      subCategoryType.videoCards,
    ],
    ['Объем видеопамяти', 'ГБ', 'integer', subCategoryType.videoCards],
    ['Микроархитектура', '', 'string', subCategoryType.videoCards],
    [
      'Максимальная температура процессора (C)',
      '°',
      'integer',

      subCategoryType.videoCards,
    ],
    ['Видеоразъемы', '', 'string', subCategoryType.videoCards],
    [
      'Видеокарта: Версия PCI Express',
      '',
      'string',

      subCategoryType.videoCards,
    ],
    [
      'Максимальное энергопотребление',
      'Вт',
      'real',

      subCategoryType.videoCards,
    ],
    ['Рекомендуемый блок питания', 'Вт', 'integer', subCategoryType.videoCards],
    ['Длина видеокарты', 'мм', 'integer', subCategoryType.videoCards],
  ])

  await controllers.propertyTypes.insertNew([
    ['Оперативная память: Гарантия', 'мес.', 'integer', subCategoryType.RAM],
    [
      'Оперативная память: Страна-производитель',
      '',
      'string',

      subCategoryType.RAM,
    ],
    ['Оперативная память: Модель', '', 'string', subCategoryType.RAM],
    ['Тип памяти', '', 'string', subCategoryType.RAM],
    ['Форм-фактор памяти', '', 'string', subCategoryType.RAM],
    ['Тактовая частота', 'МГц', 'integer', subCategoryType.RAM],
    ['Конструкция: высота', 'мм', 'integer', subCategoryType.RAM],
  ])

  await controllers.propertyTypes.insertNew([
    ['Корпус: Гарантия', 'мес.', 'integer', subCategoryType.enclosures],
    ['Корпус: Страна-производитель', '', 'string', subCategoryType.enclosures],
    ['Корпус: Модель', '', 'string', subCategoryType.enclosures],
    ['Типоразмер корпуса', '', 'string', subCategoryType.enclosures],
    ['Ориентация материнской платы', '', 'string', subCategoryType.enclosures],
    ['Корпус Габариты: Длина', 'мм', 'integer', subCategoryType.enclosures],
    ['Корпус Габариты: Ширина', 'мм', 'integer', subCategoryType.enclosures],
    ['Корпус Габариты: Высота', 'мм', 'integer', subCategoryType.enclosures],
    ['Вес корпуса', 'кг', 'real', subCategoryType.enclosures],
    ['Основной цвет корпуса', '', 'string', subCategoryType.enclosures],
    ['Материал корпуса', '', 'string', subCategoryType.enclosures],
    ['Толщина металла', 'мм', 'real', subCategoryType.enclosures],
    ['Фиксация боковых панелей', '', 'string', subCategoryType.enclosures],
    ['Комплектация', '', 'string', subCategoryType.enclosures],
  ])

  await controllers.propertyTypes.insertNew([
    ['SSD: Гарантия', 'мес.', 'integer', subCategoryType.SSDDrives],
    ['SSD: Страна-производитель', '', 'string', subCategoryType.SSDDrives],
    ['Тип SSD', '', 'string', subCategoryType.SSDDrives],
    ['Модель SSD', '', 'string', subCategoryType.SSDDrives],
    ['Объем накопителя', 'ГБ', 'integer', subCategoryType.SSDDrives],
    ['Физический интерфейс', '', 'string', subCategoryType.SSDDrives],
    [
      'Максимальная скорость последовательной записи',
      'Мбайт/сек',
      'integer',

      subCategoryType.SSDDrives,
    ],
    [
      'Максимальная скорость последовательного чтения',
      'Мбайт/сек',
      'integer',

      subCategoryType.SSDDrives,
    ],
    ['SSD Габариты: Ширина', 'мм', 'real', subCategoryType.SSDDrives],
    ['SSD Габариты: Длина', 'мм', 'real', subCategoryType.SSDDrives],
    ['SSD Габариты: Толщина (мм)', 'мм', 'real', subCategoryType.SSDDrives],
    ['SSD Габариты: Вес', 'г', 'integer', subCategoryType.SSDDrives],
  ])

  await controllers.propertyTypes.insertNew([
    ['Жесткий диск: Гарантия', 'мес.', 'integer', subCategoryType.hardDrives],
    [
      'Жесткий диск: Страна-производитель',
      '',
      'string',

      subCategoryType.hardDrives,
    ],
    ['Жесткий диск: Модель', '', 'string', subCategoryType.hardDrives],
    ['Объем HDD', 'ТБ', 'real', subCategoryType.hardDrives],
    ['Объем кэш-памяти', 'МБ', 'integer', subCategoryType.hardDrives],
    [
      'Скорость вращения шпинделя',
      'об/мин',
      'integer',

      subCategoryType.hardDrives,
    ],
    [
      'Максимальная скорость передачи данных',
      'Мбайт/сек',
      'integer',

      subCategoryType.hardDrives,
    ],
    ['Интерфейс HDD', '', 'string', subCategoryType.hardDrives],
    ['HDD Габариты: Ширина', 'мм', 'real', subCategoryType.hardDrives],
    ['HDD Габариты: Длина', 'мм', 'real', subCategoryType.hardDrives],
    ['HDD Габариты: Толщина', 'мм', 'real', subCategoryType.hardDrives],
  ])
}

controllers.user = new Controller('users', 'user_name')
controllers.bonusCards = new ControllerWithIds('bonus_cards', 'user_id', {
  user_id: controllers.user,
  bonus_count: '',
})
controllers.products = new ControllerWithIds('products', 'product_name', {
  product_name: '',
  product_desc: '',
  image_path: '',
  subcategory_id: controllers.subcategories,
  price: '',
  quantity_in_stock: '',
  additional_bonus_count: '',
})
controllers.properties = new ControllerWithIds('properties', 'id', {
  property_type_id: controllers.propertyTypes,
  product_id: controllers.products,
  property_value: ''
})

// class DictonariesController {
//   categories = []
//   subcategories = []
//   measurementUnits = []
//   dataTypes = []

//   async addDict(arr, table, key, name) {
//     arr.push(
//       (await insertIntoNew(table, `${key} = ${name}`, { [key]: name })).rows[0]
//     )
//     return arr
//   }

//   async addCategory(name) {
//     this.categories = await this.addDict(
//       this.categories,
//       'categories',
//       'category_name',
//       name
//     )
//   }

//   async addSubCategory(name) {
//     this.subcategories = await this.addDict(
//       this.subcategories,
//       'subcategories',
//       'subcategory_name',
//       name
//     )
//   }

//   async addCategories() {
//     await this.addCategory('Компьютеры, ноутбуки и ПО')
//     await this.addCategory('Комплектующие для ПК')
//     await this.addCategory('Периферия и аксессуары')
//   }

//   async addSubCategories() {
//     await this.addSubCategory('Персональные компьютеры')
//     await this.addSubCategory('Ноутбуки')
//     await this.addSubCategory('Программное обеспечение')
//     await this.addSubCategory('Процессоры')
//     await this.addSubCategory('Материнские платы')
//     await this.addSubCategory('Видеокарты')
//     await this.addSubCategory('Оперативная память')
//     await this.addSubCategory('Корпуса')
//     await this.addSubCategory('SSD накопители')
//     await this.addSubCategory('Жесткие диски')
//     await this.addSubCategory('Мониторы')
//     await this.addSubCategory('Клавиатуры')
//     await this.addSubCategory('Мыши')
//     await this.addSubCategory('Коврики для мыши')
//     await this.addSubCategory('Веб-камеры')
//     await this.addSubCategory('Наушники')
//   }

//   async addMeasurementUnit(name) {
//     this.measurementUnits = await this.addDict(
//       this.measurementUnits,
//       'measurement_units',
//       'measurement_unit_name',
//       name
//     )
//   }

//   async addMeasurementUnits() {
//     await this.addMeasurementUnit('мес.')
//     await this.addMeasurementUnit('МГц')
//     await this.addMeasurementUnit('МБ')
//     await this.addMeasurementUnit('ГБ')
//     await this.addMeasurementUnit('Гбит/с')
//     await this.addMeasurementUnit('мм')
//     await this.addMeasurementUnit("''")
//     await this.addMeasurementUnit('Гц')
//     await this.addMeasurementUnit('ppi')
//     await this.addMeasurementUnit('Кд/м²')
//     await this.addMeasurementUnit('%')
//     await this.addMeasurementUnit('Мп')
//     await this.addMeasurementUnit('Вт*ч')
//     await this.addMeasurementUnit('ч')
//     await this.addMeasurementUnit('Вт')
//     await this.addMeasurementUnit('кг')
//   }

//   async addDataType(name) {
//     this.dataTypes = await this.addDict(
//       this.dataTypes,
//       'data_types',
//       'data_type_name',
//       name
//     )
//   }

//   async addDataTypes() {
//     await this.addDataType('string')
//     await this.addDataType('integer')
//     await this.addDataType('real')
//     await this.addDataType('boolean')
//   }
// }

module.exports = {
  controllers,
  queryDictionaries,
  categoryType,
  subCategoryType,
}
