

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
- `identity`: Campo único del usuario para identificarlo (e.g., `username` o `email`).

#### Métodos

- `protect()`: Devuelve un middleware para verificar tokens JWT.
- `routes()`: Configura y devuelve las rutas de autenticación (`/register` y `/login`).

### Configuración Básica

## Prisma schema
(solo un ejemplo)
``` javascript
model user {
    id Int @id @defautl(autoincrement())
    username String @unique()
    name String 
    lastname String?
    password String
}
```

el campo identity al ser dinamico se puede usar cualquier atributo de identificación unico dentro del modelo, por ejemplo 'username', 'email' o si se tiene alguno adicional, el modelo tambien puede contener los atributos que desees aparte de estos, no es restrictivo.

En este caso vamos a trabajar con el atributo 'username'

Primero, importa la clase `Auth` y Prisma Client en tu aplicación:

```javascript
import Auth from 'express-authrouter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const auth = new Auth(prisma, process.env.YOUR_SECRET, 'username'); 
```

### Rutas de Autenticación

Agrega las rutas de autenticación a tu aplicación:

```javascript
app.use('/auth', auth.routes());
```

Esto añadirá las siguientes rutas a tu servidor:

- **POST /register**: Maneja el registro de un nuevo usuario.

- **Request Body**:
  - `identity`: Identificador único del usuario (por ejemplo, `email` o `username`).
  - `password`: Contraseña del usuario.
  ``` json
  {
    "username":"some username",
    "password":"some password"
  }
  ```

- **Respuestas**:
  - **200 OK**: Registro exitoso, devuelve un token JWT.
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
  - **409 Conflict**: El usuario ya existe.
    ```json
    {
      "error": "user already exists"
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
  - `identity`: Identificador único del usuario (por ejemplo, `email` o `username`).
  - `password`: Contraseña del usuario.
  - `campos adicionales`: la request admite mas campos en caso de que nuestro modelo cuente con campos adicionales, opcionales o requeridos
  
  ``` json
  {
    "username":"some username",
    "password":"some password",
    "other_fields":"some other fields"
  }
  ```

- **Respuestas**:
  - **200 OK**: Autenticación exitosa, devuelve un token JWT.
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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

- **Respuestas**:
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

#### `authValidator()`

Middleware para validar la estructura de la solicitud en las rutas de autenticación. se valida que los campos esten en la solicitud 

- **Respuestas**:
  - **400 Bad Request**: Error en la validación de los datos.
    ```json
    {
      "errors": [
        {
          "msg": "username/email is required",
          "param": "username/email",
          "location": "body"
        },
        {
          "msg": "Password is required",
          "param": "password",
          "location": "body"
        }
      ]
    }
    ```

#### `checkUserExists(prisma)`

Middleware para verificar si la tabla de usuarios existe en la base de datos.

- **Respuestas**:
  - **200 OK**: La tabla de usuarios existe.
  - **500 Internal Server Error**: La tabla `user` no existe o se produjo otro error.
    ```json
    {
      "error": "the table user/users don't exists"
    }
    ```

## Contribuciones

Si deseas contribuir a este paquete, por favor abre un pull request o reporta un issue.

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.
