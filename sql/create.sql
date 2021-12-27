-- пользователи
create table users(
	id serial primary key,
	user_name varchar(100) not null,
	user_password varchar(100) not null,
	isAdmin boolean not null
);

-- категории
create table categories(
	id serial primary key,
	category_name varchar(100) not null
);

-- подкатегории
create table subcategories(
	id serial primary key,
	subcategory_name varchar(100) not null,
	category_id int not null,
	foreign key (category_id) references categories (id)
);

-- товары
create table products(
	id serial primary key,
	product_name varchar(100) not null,
	product_desc text,
	image_path varchar(100),
	subcategory_id int not null,
	price real not null,
	quantity_in_stock int not null,
	additional_bonus_count int not null,
	foreign key (subcategory_id) references subcategories (id)
);

-- покупки
create table purchases(
	id serial primary key,
	user_id int not null,
	product_id int not null,
	date_of_purchase date not null,
	price real not null,
	quantity int not null,
	foreign key (user_id) references users (id),
	foreign key (product_id) references products (id)
);

-- возвраты
create table refunds(
	id serial primary key,
	purchase_id int not null,
	quantity int not null,
	date_of_refund date not null,
	reason_for_refund text,
	foreign key (purchase_id) references purchases (id)
);

-- бонусные карты
create table bonus_cards(
	id serial primary key,
	user_id int not null,
	bonus_count int not null,
	foreign key (user_id) references users (id)
);

-- единицы измерения
create table measurement_units(
	id serial primary key,
	measurement_unit_name varchar(25) not null
);

-- типы данных
create table data_types(
	id serial primary key,
	data_type_name varchar(10) not null
);

-- типы характеристик
create table property_types(
	id serial primary key,
	property_name varchar(100) not null,
	measurement_unit_id int not null,
	data_type_id int not null,
	subcategory_id int not null,
	foreign key (measurement_unit_id) references measurement_units (id),
	foreign key (data_type_id) references data_types (id),
	foreign key (subcategory_id) references subcategories (id)
);

-- характеристики
create table properties(
	id serial primary key,
	property_type_id int not null,
	product_id int not null,
	property_value varchar(255) not null,
	foreign key (property_type_id) references property_types (id),
	foreign key (product_id) references products (id)
);