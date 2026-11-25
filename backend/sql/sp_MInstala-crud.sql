/* ============================================================================
   [Calculo].[sp_MInstala] — CRUD + auditoría de [Calculo].[TblInstala]

   Convención tomada de [Calculo].[sp_Valuni_LogCambio] (valores unitarios):
   un único procedimiento con @Accion y tokens en mayúsculas.

   Acciones:
     ANIOS        -> años distinct, orden descendente
     CONSULTA     -> filas activas (nestado = 1) de @anno; @FiltroCateg = 1
                     filtra por @categ (NULL = categoría nula)
     ALTA         -> insert en TblInstala + fila de historial con accion = 'ALTA'
     MODIFICACION -> update de datos + fila de historial con accion = 'MODIFICACION'
     BAJA         -> update nestado = 0 + historial con accion = 'BAJA'
     ELIMINACION  -> alias de BAJA, historial con accion = 'ELIMINACION'

   La baja es lógica: el SP nunca ejecuta DELETE sobre TblInstala.
   La clave natural es (id_instala, anno, categ); categ es anulable.

   IMPORTANTE: hoy existen los triggers [3KStr_AudUpdTblInstala] y
   [3KStr_AudDelTblInstala] sobre TblInstala, con definición no legible.
   Si cualquiera de ellos inserta en [Historial].[HTblInstala], este SP
   duplicará el historial. Verificar antes de desplegar y deshabilitar el
   trigger o quitar el INSERT de auditoría de este procedimiento.

   El backend SIGMUN sigue usando DML parametrizado; este SP es el script
   de despliegue en BD y no está conectado todavía desde NestJS.
   ============================================================================ */

CREATE OR ALTER PROCEDURE [Calculo].[sp_MInstala]
    @Accion        varchar(20),
    @id_instala    char(3)       = NULL,
    @anno          char(4)       = NULL,
    @categ         nchar(2)      = NULL,
    @FiltroCateg   bit           = 0,
    @instala       varchar(200)  = NULL,
    @uni_med       varchar(15)   = NULL,
    @valor         decimal(12,2) = NULL,
    @descri_gener  varchar(200)  = NULL,
    @nestado       tinyint       = 1,
    @vusernm       varchar(25),
    @vhostnm       varchar(25)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ddatetm       datetime = GETDATE();
    DECLARE @categHist     nchar(2) = NULL;
    DECLARE @accionHist    varchar(30);
    DECLARE @histCategLen  int;

    BEGIN TRY
        IF @Accion IS NULL OR LTRIM(RTRIM(@Accion)) = ''
            THROW 50001, 'Accion es obligatoria.', 1;

        SET @Accion = UPPER(LTRIM(RTRIM(@Accion)));

        /* ---------- solo lectura ---------- */
        IF @Accion = 'ANIOS'
        BEGIN
            SELECT DISTINCT anno
            FROM [Calculo].[TblInstala]
            ORDER BY anno DESC;
            RETURN;
        END

        IF @Accion = 'CONSULTA'
        BEGIN
            IF @anno IS NULL OR LEN(LTRIM(RTRIM(@anno))) <> 4
                THROW 50002, 'anno debe tener 4 digitos.', 1;

            SELECT id_instala, anno, instala, uni_med, valor, descri_gener,
                   nestado, vhostnm, vusernm, ddatetm, categ
            FROM [Calculo].[TblInstala]
            WHERE anno = @anno
              AND nestado = 1
              AND (
                    @FiltroCateg = 0
                    OR (@categ IS NULL     AND categ IS NULL)
                    OR (@categ IS NOT NULL AND categ = @categ)
                  )
            ORDER BY id_instala, categ;
            RETURN;
        END

        IF @Accion NOT IN ('ALTA', 'MODIFICACION', 'BAJA', 'ELIMINACION')
            THROW 50003, 'Accion no reconocida. Use ALTA, MODIFICACION, BAJA o ELIMINACION.', 1;

        /* ---------- validación de clave ---------- */
        IF @id_instala IS NULL OR LEN(LTRIM(RTRIM(@id_instala))) <> 3
            THROW 50004, 'id_instala debe tener 3 caracteres.', 1;

        IF @anno IS NULL OR LEN(LTRIM(RTRIM(@anno))) <> 4
            THROW 50005, 'anno debe tener 4 digitos.', 1;

        IF @categ IS NOT NULL AND LEN(LTRIM(RTRIM(@categ))) > 2
            THROW 50006, 'categ no puede exceder 2 caracteres.', 1;

        /* El historial tiene categ nchar(1); no se trunca silenciosamente. */
        SELECT @histCategLen = CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'Historial'
          AND TABLE_NAME = 'HTblInstala'
          AND COLUMN_NAME = 'categ';

        IF @categ IS NOT NULL
           AND LEN(LTRIM(RTRIM(@categ))) > ISNULL(@histCategLen, 1)
            THROW 50007, 'categ no cabe en Historial.HTblInstala.categ; amplie esa columna a nchar(2).', 1;

        SET @categHist = CASE
            WHEN @categ IS NULL THEN NULL
            ELSE CAST(LEFT(LTRIM(RTRIM(@categ)), ISNULL(@histCategLen, 1)) AS nchar(2))
        END;

        /* ---------- alta ---------- */
        IF @Accion = 'ALTA'
        BEGIN
            IF @instala IS NULL OR LTRIM(RTRIM(@instala)) = ''
                OR @uni_med IS NULL OR LTRIM(RTRIM(@uni_med)) = ''
                OR @descri_gener IS NULL OR LTRIM(RTRIM(@descri_gener)) = ''
                OR @valor IS NULL OR @valor < 0 OR @valor > 9999999999.99
                OR ISNULL(@nestado, 0) NOT IN (0, 1)
                THROW 50008, 'Datos de alta inválidos.', 1;

            IF EXISTS (
                SELECT 1 FROM [Calculo].[TblInstala]
                WHERE id_instala = @id_instala
                  AND anno = @anno
                  AND ((@categ IS NULL AND categ IS NULL) OR categ = @categ)
            )
                THROW 50009, 'Ya existe una fila con esa clave.', 1;

            BEGIN TRAN;
                INSERT INTO [Calculo].[TblInstala]
                    (id_instala, anno, instala, uni_med, valor, descri_gener,
                     nestado, vhostnm, vusernm, ddatetm, categ)
                VALUES
                    (@id_instala, @anno, @instala, @uni_med, @valor, @descri_gener,
                     @nestado, @vhostnm, @vusernm, @ddatetm, @categ);

                INSERT INTO [Historial].[HTblInstala]
                    (id_instala, anno, instala, uni_med, valor, descri_gener,
                     nestado, vhostnm, vusernm, ddatetm, categ, accion)
                VALUES
                    (@id_instala, @anno, @instala, @uni_med, @valor, @descri_gener,
                     @nestado, @vhostnm, @vusernm, @ddatetm, @categHist, 'ALTA');
            COMMIT TRAN;

            SELECT id_instala, anno, instala, uni_med, valor, descri_gener,
                   nestado, vhostnm, vusernm, ddatetm, categ
            FROM [Calculo].[TblInstala]
            WHERE id_instala = @id_instala
              AND anno = @anno
              AND ((@categ IS NULL AND categ IS NULL) OR categ = @categ);
            RETURN;
        END

        /* ---------- modificación ---------- */
        IF @Accion = 'MODIFICACION'
        BEGIN
            IF @instala IS NULL OR LTRIM(RTRIM(@instala)) = ''
                OR @uni_med IS NULL OR LTRIM(RTRIM(@uni_med)) = ''
                OR @descri_gener IS NULL OR LTRIM(RTRIM(@descri_gener)) = ''
                OR @valor IS NULL OR @valor < 0 OR @valor > 9999999999.99
                THROW 50008, 'Datos de modificación inválidos.', 1;

            BEGIN TRAN;
                UPDATE [Calculo].[TblInstala]
                SET instala = @instala,
                    uni_med = @uni_med,
                    valor = @valor,
                    descri_gener = @descri_gener,
                    vhostnm = @vhostnm,
                    vusernm = @vusernm,
                    ddatetm = @ddatetm
                WHERE id_instala = @id_instala
                  AND anno = @anno
                  AND ((@categ IS NULL AND categ IS NULL) OR categ = @categ);

                IF @@ROWCOUNT = 0
                BEGIN
                    ROLLBACK TRAN;
                    THROW 50010, 'No existe la fila con esa clave.', 1;
                END

                INSERT INTO [Historial].[HTblInstala]
                    (id_instala, anno, instala, uni_med, valor, descri_gener,
                     nestado, vhostnm, vusernm, ddatetm, categ, accion)
                VALUES
                    (@id_instala, @anno, @instala, @uni_med, @valor, @descri_gener,
                     1, @vhostnm, @vusernm, @ddatetm, @categHist, 'MODIFICACION');
            COMMIT TRAN;

            SELECT id_instala, anno, instala, uni_med, valor, descri_gener,
                   nestado, vhostnm, vusernm, ddatetm, categ
            FROM [Calculo].[TblInstala]
            WHERE id_instala = @id_instala
              AND anno = @anno
              AND ((@categ IS NULL AND categ IS NULL) OR categ = @categ);
            RETURN;
        END

        /* ---------- baja lógica ---------- */
        SET @accionHist = CASE WHEN @Accion = 'ELIMINACION' THEN 'ELIMINACION' ELSE 'BAJA' END;
        SET @nestado = 0;

        BEGIN TRAN;
            UPDATE [Calculo].[TblInstala]
            SET nestado = 0,
                vhostnm = @vhostnm,
                vusernm = @vusernm,
                ddatetm = @ddatetm
            WHERE id_instala = @id_instala
              AND anno = @anno
              AND ((@categ IS NULL AND categ IS NULL) OR categ = @categ);

            IF @@ROWCOUNT = 0
            BEGIN
                ROLLBACK TRAN;
                THROW 50010, 'No existe la fila con esa clave.', 1;
            END

            INSERT INTO [Historial].[HTblInstala]
                (id_instala, anno, instala, uni_med, valor, descri_gener,
                 nestado, vhostnm, vusernm, ddatetm, categ, accion)
            SELECT id_instala, anno, instala, uni_med, valor, descri_gener,
                   0, @vhostnm, @vusernm, @ddatetm, @categHist, @accionHist
            FROM [Calculo].[TblInstala]
            WHERE id_instala = @id_instala
              AND anno = @anno
              AND ((@categ IS NULL AND categ IS NULL) OR categ = @categ);
        COMMIT TRAN;

        SELECT id_instala, anno, instala, uni_med, valor, descri_gener,
               nestado, vhostnm, vusernm, ddatetm, categ
        FROM [Calculo].[TblInstala]
        WHERE id_instala = @id_instala
          AND anno = @anno
          AND ((@categ IS NULL AND categ IS NULL) OR categ = @categ);
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRAN;
        THROW;
    END CATCH
END
GO

/* ---------- comprobación rápida después de desplegar ----------
EXEC [Calculo].[sp_MInstala] @Accion = 'ANIOS', @vusernm = 'test', @vhostnm = 'test';
EXEC [Calculo].[sp_MInstala] @Accion = 'CONSULTA', @anno = '2026', @vusernm = 'test', @vhostnm = 'test';
SELECT accion, COUNT(*) AS filas FROM [Historial].[HTblInstala] GROUP BY accion;
---------------------------------------------------------------- */
