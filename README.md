

# Express-authrouter

 [![Made with Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://prisma.io)![express](https://img.shields.io/badge/Express%20js-000000?style=for-the-badge&logo=express&logoColor=white)![nodejs](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)![jwt](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)![js](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)![json](https://img.shields.io/badge/json-5E5C5C?style=for-the-badge&logo=json&logoColor=white)

Este paquete npm proporciona una implementación sencilla y reutilizable de rutas de autenticación (registro y login) utilizando Express y Prisma ORM. Está diseñado para ser fácilmente integrado en proyectos existentes.

## Dependencias

Este proyecto utiliza las siguientes dependencias clave:

* **bcrypt** 
* **express** 
* **express-validator**
* **jsonwebtoken**
* **prisma ORM**


## Instalación

Para instalar el paquete, ejecuta el siguiente comando:

```bash
npm install express-authrouter
```

## Uso

### `Auth`

#### Constructor

- `prismaObj`: Instancia del PrismaClient.
- `secret`: Clave secreta para la generación de tokens JWT.
- `identities[]`: Listado de campos unicos del usuario, puede ser uno o varios (e.g., [`username`,`email`]).

#### Métodos

- `protect()`: Devuelve un middleware para verificar tokens JWT.
- `routes()`: Configura y devuelve las rutas de autenticación (`/register` y `/login`).
- `result()`: middleware de Express que se utiliza para manejar los resultados de validación de express-validator

### Configuración Básica

## Prisma schema
(solo un ejemplo)
``` javascript
model user {
    id Int @id @defautl(autoincrement())
    username String @unique() // required
    name String 
    lastname String?
    password String // required
}
```

el campo identities al ser dinamico se puede usar cualquier atributo de identificación unico dentro del modelo, el modelo tambien puede contener los atributos que desees aparte de estos, no es restrictivo.

En este caso vamos a trabajar con el atributo 'username'

Primero, importa la clase `Auth` y Prisma Client en tu aplicación:

```javascript
import Auth from 'express-authrouter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const auth = new Auth(prisma, process.env.YOUR_SECRET, ['username']); 
```
otro uso con multiples campos unicos
```javascript 
const auth = new Auth(prisma, process.env.YOUR_SECRET, ['username', 'email']);
```
### Rutas de Autenticación

Agrega las rutas de autenticación a tu aplicación:

```javascript
app.use('/auth', auth.routes());
```

Esto añadirá las siguientes rutas a tu servidor:

- **POST /register**: Maneja el registro de un nuevo usuario.

- **Request Body**:
  - `identities[] `: Identificadores únicos del usuario que fueron definidos en el array identities, en este caso solo es username
  - `password`: Contraseña del usuario.
  ``` json
  {
    "username":"some username",
    "password":"some password",
    "...other fields"
  }
  ```
  en caso de tener mas campos unicos ej: `['username', 'email']`
  ``` json
  {
    "username":"some username",
    "email":"some email",
    "password":"some password",
    "...other fields"
  }

- **Responses**:
  - **200 OK**: Registro exitoso, devuelve un token JWT.
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```

  - **409 Conflict**: El nombre de usuario/email ya esta tomado. (en caso de tener varios identities estos van a ser validados automaticamente)
    ```json
    {
      "error": "username is already taken"
    }
    ```
    ### nota
    tanto la contraseña, como los campos que se marquen como identities se validaran de forma nativa, los demas campos deberan ser validados externamente (el paquete ofrece una facil implementacion con express-validator)
  - **400 bad request**: faltan campos 
    ```json
      {
        "error": "password is required"
      }
    ```
  - **500 Internal Server Error**: Error en el servidor.
    ```json
    {
      "error": "error message..."
    }
    ```

- **POST /auth/login**:
Maneja la autenticación de un usuario existente.

- **Request Body**:

  el valor que se pasa para el login es el primer elemento de el array de identities, por ejemplo, si nuestro array es `['username', 'email']`, el valor que se usara para loguearse es username

  - `username`: Identificador único del usuario.
  - `password`: Contraseña del usuario.
  - `campos adicionales`: la request admite mas campos en caso de que nuestro modelo cuente con campos adicionales, opcionales o requeridos
  
  ``` json
  {
    "username":"some username",
    "password":"some password",
    "other_fields":"some other fields"
  }
  ```

- **Responses**:
  - **200 OK**: Autenticación exitosa, devuelve un token JWT.
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
    - **400 bad request**: faltan campos 
    ```json
      {
        "error": "password is required"
      }
    ```
  - **401 Unauthorized**: Contraseña incorrecta.
    ```json
    {
      "error": "incorrect password"
    }
    ```
  - **404 Not Found**: El usuario no existe.
    ```json
    {
      "error": "user not found"
    }
    ```
  - **500 Internal Server Error**: Error en el servidor.
    ```json
    {
      "error": "error message..."
    }
    ```

### Middleware de Protección de Rutas

Puedes proteger rutas utilizando el método `protect()`:

```javascript
app.use('/ruta-protegida', auth.protect(), (req, res) => {
  res.send('ruta protegida');
});
```

#### `auth.protect()`

Middleware para verificar el token JWT en las peticiones.

- **Request body**:
`headers:` `{token: example.token}`

- **Responses**:
  - **200 OK**: Token válido, se permite el acceso a la ruta protegida.
  - **403 Forbidden**: No se proporcionó token.
    ```json
    {
      "message": "no token provided"
    }
    ```
  - **401 Unauthorized**: Token inválido o expirado.
    ```json
    {
      "error": "invalid token"
    }
    ```


### Default Middlewares

los siguientes middlewares ya se aplican por defecto en las rutas de login y registro.

#### `userModelExists()`

Middleware para verificar si la tabla de usuarios existe en la base de datos.

- **Responses**:
  - **500 Internal Server Error**: La tabla `user` no existe o se produjo otro error.
    ```json
    {
      "error": "the table user/users don't exists"
    }
    ```

#### `checkUserExists()`
es un middleware de Express que se utiliza para comprobar si un usuario existe en la base de datos basándose en identidades proporcionadas.

- **Responses**:
  - **400 bad request**: Se devuelve este código de error y mensaje cuando faltan identidades necesarias en la solicitud.
    ```json
    { "error": "email, username are required" }
    ```
  - **409 Código de error**: Se devuelve este código de error y mensaje cuando se trata de registrar un usuario con un identity que ya existe en base de datos
    ```json
      { "error": "email is already taken" }
    ```

  - **500 Código de error**: Se devuelve este código de error y mensaje cuando se produce un error durante el proceso de verificación de la existencia del usuario.

  ```json 
    { "error": "An error occurred    while checking user existence" }
  ```

### Implementacion de express-validator auth.result()

``` javascript
npm install express-validator
```

El paquete ofrece un Middleware para validar la estructura de la solicitud en las rutas de autenticación. para los campos ademas de el password y aquellos que no sean unicos (array de identities)

y se puede implementar de la siguiente manera:

digamos que tienes un campo que no es unico llamado `name` en tu modelo
```javascript
  const registerValidationRules = [
  body('name')
   .notEmpty()
   .withMessage('name is required'),
   (req, res, next) => {
    auth.result(req,res,next)
  },
];


app.use('/', registerValidationRules ,(req,res) => {
  res.send('Example route');
});
```

- **Responses**:
  - **400 Bad Request**: En caso de que no se cumpla con las validaciones se da la siguiente respuesta 
    ```json
    {
      "errors": [
        {
          "msg": "name is required",
          "param": "name",
          "location": "body"
        },
      ]
    }
    ```

aplicar express-validator para los campos definidos dentro de el arrat identities no es necesario, ya que estos se validan, pero se pueden hacer validaciones adicionales con express-validator

## Contribuciones

Si deseas contribuir a este paquete, por favor abre un pull request o reporta un issue.

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.
