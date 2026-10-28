CREATE PROCEDURE [Rentas].[sp_generardeuda]
@busc int = 1, @inicio int = '', @final int = '', @codigo varchar(7) = '', @preimpreso varchar(20) = '', @anno_multa varchar(10) = '', @numero_multa varchar(15) = '', @serie char(1) = 'A', @fecha_multa varchar(10) = '01/01/1900', @anno_area int = '', @infraccion varchar(50) = '', @monto_multa numeric(10, 2) = 0, @antecedente varchar(255) = '', @numero_notificacion int = '', @estado varchar(20) = '', @numero_recibo varchar(20) = '', @cta_cte varchar(20) = '', @cantidad varchar(20) = '', @codigo_autoridad_municipal varchar(10) = '', @codigo_area varchar(50) = '', @tipo_infraccion varchar(50) = '', @codigo_infraccion varchar(50) = '', @codigo_adicional varchar(50) = '', @base varchar(10) = '', @factor numeric(10, 2) = 0, @fecha_notificacion varchar(10) = '01/01/1900', @idrecibo int = '', @tipo varchar(10) = '', @tipo_rec varchar(10) = '', @glosa varchar(200) = '', @e_resolucion char(1) = '', @fech_notificacion2 datetime = '', @n_resolucion varchar(30) = '', @glosa_notificacion varchar(250) = '', @operador varchar(20) = '', @estacion varchar(15) = '', @usuario_id_mod varchar(20) = '', @fecha_mod datetime = '', @ip_mod varchar(15) = '', @estadomulta char(1) = '1', @t_vehiculo char(1) = '', @desde char(4) = '1998', @hasta char(4) = ''
WITH EXEC AS CALLER

AS
--SET NOCOUNT ON
DECLARE @tipoinfr   VARCHAR (5) = ''
DECLARE @fmulta   DATETIME
DECLARE @mensaje   VARCHAR (50) = ''


IF @busc = 1 GOTO msselec
IF @busc = 2 GOTO mscount
IF @busc = 3 GOTO msinsert
IF @busc = 4 GOTO mseditar
IF @busc = 5 GOTO selec_editar
IF @busc = 6 GOTO msdelete
IF @busc = 7 GOTO cmbAutoridadMunicipal
IF @busc = 8 GOTO cmbAreasMunicipales
IF @busc = 9 GOTO cmbEstado
IF @busc = 10 GOTO cmbtupa
IF @busc = 11 GOTO cmbtupatodos
IF @busc = 12 GOTO msinsertanios

msselec: --   exec rentas.sp_multasadmin @busc='1' ,@codigo='0000001'        select * from ma_m_autoridad_municipal select * from coactivo.deuda_h_varios
BEGIN
   DECLARE @SQL_string   NVARCHAR (1500)
   DECLARE @ParmDefinition   NVARCHAR (1500)

   DECLARE @SQL_columns   NVARCHAR (1500)
   DECLARE @SQL_order   NVARCHAR (1500)
   DECLARE @SQL_inc   NVARCHAR (1500)
   DECLARE @SQL_limits   NVARCHAR (1500)

   SET @ParmDefinition = N'@start int, @end int'
   SET @SQL_columns =' ma.codigo, ma.preimpreso,ma.anno_multa,cast(ma.numero_multa as varchar) as num_multa,convert(varchar(10),ma.fecha_multa,103) fecha_multa,ma.anno_area,    
      (select concepto from caja.Tipo_Ingresos_Det where tipo=ma.codigo_infraccion) as infraccion,    
      ma.monto_multa, ma.antecedente, ma.numero_notificacion,ma.estado,ma.numero_recibo,isnull(cast(ma.anno_multa as varchar(20)),'''')+'' ''+isnull(cast(ma.obligacion_id as varchar(20)),'''') cta_cte,    
      ma.cantidad,ma.codigo_autoridad_municipal,ma.base,descripcion_estado=substring((SELECT DESCRIPCION FROM ma_e_estado_multa WHERE CODIGO_ESTADO=ma.estado and codigo_tributo=2),1,1),    
      ma.numero_multa,convert(varchar(10),ma.fecha_notificacion,103) as fecha_notificacion,descripcion_autoridad=(select descripcion from ma_m_autoridad_municipal where codigo_autoridad=ma.codigo_autoridad_municipal and anno_area=2004),    
      ma.e_resolucion,ma.glosa '

   SET @SQL_inc =' where ma.codigo=''' + @codigo + ''' and ma.estadomulta=''1'' '
   SET @SQL_order = ' order by ma.numero_multa DESC '
   SET @SQL_limits = ''
   IF (@inicio <> '' AND @final <> '')
      SET @SQL_limits = ' WHERE ROW >= @start AND ROW <= @end '
   SET @SQL_string =N'SELECT * FROM ( select '+ @SQL_columns+ ', ROW_NUMBER() OVER ('+ @SQL_order+ ')     
      AS ROW from coactivo.deuda_h_varios ma '+ @SQL_inc+ ') AS ALIAS '+ @SQL_limits
   PRINT @SQL_string

   EXECUTE sp_executesql @SQL_string, @ParmDefinition, @start = @inicio, @end = @final
   RETURN
END

mscount:
BEGIN
   SET @SQL_inc =' where ma.codigo=''' + @codigo + ''' AND  ma.estadomulta=''1'' '

   SET @SQL_string = N'SELECT count(*) FROM coactivo.deuda_h_varios ma ' + @SQL_inc
   PRINT @SQL_string
   EXECUTE sp_executesql @SQL_string
   RETURN
END

msinsert:
BEGIN
   IF (@codigo_infraccion <> '')
   BEGIN
      IF (SELECT count (numero_multa) FROM coactivo.deuda_h_varios) = 0
      BEGIN
         SET @numero_multa = '00000001'
      END
      ELSE
      BEGIN
         SELECT @numero_multa = right ('0000000'+ cast (max (isnull (cast (numero_multa AS INT), 0))+ 1 AS VARCHAR),10)
         FROM coactivo.deuda_h_varios
      END
      SET @codigo_infraccion =
         CASE WHEN @codigo_infraccion = '00.46' THEN '02.01' ELSE
         CASE WHEN @codigo_infraccion = '00.47' THEN '11.00' ELSE
         CASE WHEN @codigo_infraccion = '00.48' THEN '00.30' ELSE
         CASE WHEN @codigo_infraccion = '46.35' THEN '02.01' ELSE
         CASE WHEN @codigo_infraccion = '00.50' THEN '00.38' ELSE @codigo_infraccion END END END END END
         + @codigo_infraccion
      SET @tipoinfr = substring (@codigo_infraccion, 1, 5)
      PRINT @tipoinfr
      BEGIN TRY
         INSERT INTO coactivo.deuda_h_varios (
            codigo,preimpreso,anno_multa,numero_multa,serie,fecha_multa,anno_area,codigo_area,
            tipo_infraccion,codigo_infraccion,numero_licencia,codigo_adicional,monto_multa,antecedente,numero_notificacion,
            estado,factor,numero_recibo,cantidad,codigo_autoridad_municipal,base,fecha_notificacion,fech_ing,glosa,
            e_resolucion,fech_notificacion2,n_resolucion,glosa_notificacion,operador,estacion,estadomulta,ip_mod)
         VALUES (
            @codigo,@preimpreso,@anno_multa,@numero_multa,@serie,@fecha_multa,@anno_area,@codigo_area,
            @tipo_infraccion,@codigo_infraccion,@t_vehiculo,@codigo_adicional,@monto_multa,@antecedente,@numero_notificacion,
            @estado,@factor,@numero_recibo,@cantidad,@codigo_autoridad_municipal,@base,@fecha_notificacion,getdate (),@glosa,
            @e_resolucion,@fech_notificacion2,@n_resolucion,@glosa_notificacion,@operador,@estacion,@estadomulta,@ip_mod)

         declare @ubica1 varchar(5)=''
         set @ubica1 = case when @tipoinfr = '00.97' then 'CC' else 'EM' end
         set @codigo_infraccion = case when @tipoinfr = '00.97' then '02.01'+@codigo_infraccion else @codigo_infraccion end

         --right('0000000'+cast(cast(@codigo as int) as varchar(7)),7)
         INSERT INTO caja.mrecibos (
            codigo,anno,cod_pred,anexo,sub_anexo,tipo_docu,num_docu,tipo,tipo_rec,periodo,imp_insol,fact_reaj,
            imp_reaj,fact_mora,mora,costo_emis,observacion,estado,ubica,fec_venc,fec_pago,num_ingr,operador,estacion,fech_ing)
         VALUES (
            rtrim (@codigo),@anno_multa,'','','','',@numero_multa,@tipoinfr,substring (@codigo_infraccion, 6, 5),'01',@monto_multa,1.00,
            @monto_multa,0.00,0.00,0.00,@glosa,'0',@ubica1,@fecha_multa,getdate (),'0',@operador,@estacion,getdate ())

         SELECT @idrecibo = max (idrecibo)
         FROM caja.mrecibos
         WHERE codigo = @codigo AND anno = @anno_multa AND num_docu = @numero_multa

         UPDATE coactivo.deuda_h_varios
         SET numero_recibo = @idrecibo
         WHERE codigo = @codigo AND anno_multa = @anno_multa AND numero_multa = @numero_multa
      END TRY
      BEGIN CATCH
         SELECT @mensaje = ERROR_MESSAGE ()
      END CATCH

      --return (@mensaje)
      SELECT 'Actualizado correctamente.'
   END
   ELSE
   BEGIN
      SELECT 'sp_generardeuda. Falta Codigo Infraccion. No seas palomilla.'
   END
END

RETURN

msinsertanios:
begin
   if(@hasta = '')
   SET @hasta = CAST(YEAR(GETDATE()) AS VARCHAR(4));
   
   IF (@codigo_infraccion <> '')
   BEGIN
      DECLARE @anio    CHAR (4) = '',@reg     INT = 0,@deuda   DECIMAL (18, 2) = 0
      
      if (select count(numero_multa) from coactivo.deuda_h_varios)=0
      begin
          set @numero_multa='00000001'
      end
      else
      begin
          select @numero_multa=right('0000000'+cast(max(isnull(cast(numero_multa as int),0))+1 as varchar),10) from coactivo.deuda_h_varios
      end 
      SET @codigo_infraccion =
            CASE WHEN @codigo_infraccion = '00.46' THEN '02.01' ELSE
            CASE WHEN @codigo_infraccion = '00.47' THEN '11.00' ELSE
            CASE WHEN @codigo_infraccion = '00.48' THEN '00.30' ELSE
            CASE WHEN @codigo_infraccion = '46.35' THEN '02.01' ELSE
            CASE WHEN @codigo_infraccion = '00.50' THEN '00.38' ELSE @codigo_infraccion
            END END END END END + @codigo_infraccion

      SET @tipoinfr = substring (@codigo_infraccion, 1, 5)

      --PRINT @tipoinfr

      SET @anio = @desde

      WHILE (@anio <= @hasta)
      BEGIN
         --begin transaction
         BEGIN TRY
            SELECT @reg = count (*)
            FROM caja.mrecibos
            WHERE codigo = @codigo AND anno = @anio AND tipo_rec = substring (@codigo_infraccion, 6, 5) AND estado = '0'

            SELECT @deuda = isnull (sum (imp_insol), 0)
            FROM caja.mrecibos
            WHERE codigo = @codigo AND anno = @anio AND tipo = @tipoinfr AND estado = '0'
               AND tipo_rec NOT IN ('00.46','00.47','00.48','00.49','00.50','46.35','30.82')

            --select @codigo,@anio, @deuda, @reg
            --IF(@reg = 0 AND @deuda > 0 AND substring (@codigo_infraccion, 6, 5) IN ('00.46','00.47','00.48','00.49','00.50','46.35','30.82'))
            --OR (@reg = 0 AND @deuda >= 0 AND substring (@codigo_infraccion, 6, 5) NOT IN ('00.46','00.47','00.48','00.49','00.50','46.35','30.82'))
            BEGIN
               --PRINT 'inserta ' + @anio
               declare @ubica varchar(5)=''
               set @ubica = case when @tipoinfr = '00.97' then 'CC' else 'EM' end
               set @codigo_infraccion = case when @tipoinfr = '00.97' then '02.01'+@codigo_infraccion else @codigo_infraccion end
              
               INSERT INTO caja.mrecibos (
                  codigo,anno,cod_pred,anexo,sub_anexo,tipo_docu,num_docu,tipo,tipo_rec,periodo,imp_insol,
                  fact_reaj,imp_reaj,fact_mora,mora,costo_emis,observacion,estado,ubica,fec_venc,fec_pago,num_ingr,operador,estacion,fech_ing,usuregistro)
               VALUES (
                  rtrim (@codigo),@anio,'','','','',@numero_multa,@tipoinfr,substring (@codigo_infraccion, 6, 5),'01',@monto_multa,
                  1.00,@monto_multa,0.00,0.00,0.00,@glosa,'0',@ubica ,@fecha_multa,'','',@operador,@estacion,getdate (),@operador)
               END
            IF @@ROWCOUNT > 0
                SELECT 'Actualizado correctamente.. '
            ELSE
               SELECT 'NIMI'
            --commit transaction
            SET @anio = @anio + 1
         END TRY
         BEGIN CATCH
            SELECT 'fallla'

            PRINT ERROR_PROCEDURE ()
            PRINT ERROR_MESSAGE ()
            --rollback transaction
            INSERT INTO dbo.ErrorMigracion (Tabla,codigo,año,cod_pred,usuario,[mensaje],[Severidad],
               [Estado],[Procedimiento],[Linea],[Nro_error])
            SELECT 'Rentas.sp_generardeuda',@codigo,@anio,'',@operador,error_message () AS errornumber,error_severity () AS errorseverity,
               error_state () AS errorstate,error_procedure () AS errorprocedure,error_line () AS errorline,error_number () AS errormessage
         END CATCH
      END
   END
   ELSE
   BEGIN
      SELECT 'Falta Codigo Infraccion'
   END
   RETURN
end
/*
 if (select count(numero_multa) from coactivo.deuda_h_varios)=0
 begin
 set @numero_multa='00000001'
 end
 else
 begin
 select @numero_multa=right('0000000'+cast(max(isnull(cast(numero_multa as int),0))+1 as varchar),10) from coactivo.deuda_h_varios
 end

set @codigo_infraccion = case when @codigo_infraccion = '00.46' then '02.01' else
                        case when @codigo_infraccion = '00.47' then '11.00' else
                        case when @codigo_infraccion = '00.48' then '00.30' else
                        case when @codigo_infraccion = '00.50' then '00.38' else @codigo_infraccion end end end end + @codigo_infraccion
set @tipoinfr = substring(@codigo_infraccion,1,5)

print @tipoinfr

set @fmulta = getdate() --CONVERT(datetime, @fecha_multa,103) -- mvc 22112022
--set @fmulta = @fecha_multa

BEGIN TRY
 insert into coactivo.deuda_h_varios
 (codigo, preimpreso,anno_multa,numero_multa, serie,fecha_multa,anno_area,codigo_area,tipo_infraccion,codigo_infraccion,numero_licencia,
  codigo_adicional,monto_multa,antecedente,numero_notificacion,estado,factor, numero_recibo,cantidad, codigo_autoridad_municipal,
  base,fecha_notificacion,fech_ing,glosa,e_resolucion,fech_notificacion2,n_resolucion,glosa_notificacion,operador,estacion,estadomulta,ip_mod)
 values
 (@codigo,@preimpreso,@anno_multa,@numero_multa,@serie,@fmulta,@anno_area,@codigo_area,@tipo_infraccion,@codigo_infraccion,@t_vehiculo,
  @codigo_adicional,@monto_multa,@antecedente,@numero_notificacion,@estado,@factor,@numero_recibo,@cantidad,@codigo_autoridad_municipal,
  @base,@fecha_notificacion,getdate(),@glosa,@e_resolucion,@fecha_notificacion,@n_resolucion,@glosa_notificacion,@operador,@estacion,@estadomulta,@ip_mod)

--right('0000000'+cast(cast(@codigo as int) as varchar(7)),7)
 insert into caja.mrecibos
 (codigo, anno,cod_pred,anexo,sub_anexo,tipo_docu,num_docu,tipo,tipo_rec,periodo,imp_insol,fact_reaj,imp_reaj,fact_mora,mora,costo_emis,observacion,
  estado,ubica,fec_venc,fec_pago, num_ingr,operador,estacion, fech_ing)
 values
 (rtrim(@codigo),@anno_multa,'','','','',@numero_multa,@tipoinfr,substring(@codigo_infraccion,6,5), '01',@monto_multa,1.00,@monto_multa,0.00,0.00,0.00,
  @glosa, '0','EM',@fmulta,getdate(),'0',@operador, @estacion, getdate())

 select @idrecibo=max(idrecibo) from caja.mrecibos where codigo=@codigo and anno=@anno_multa and num_docu=@numero_multa

 update coactivo.deuda_h_varios set numero_recibo=@idrecibo where codigo=@codigo and anno_multa=@anno_multa and numero_multa=@numero_multa

 select 'bien' as mensaje
END TRY
BEGIN CATCH
 select @mensaje = ERROR_MESSAGE()
END CATCH
return (@mensaje)
    */
mseditar:
begin
   SET @codigo_infraccion =
      CASE WHEN @codigo_infraccion = '00.46' THEN '02.01' ELSE
      CASE WHEN @codigo_infraccion = '00.47' THEN '11.00' ELSE
      CASE WHEN @codigo_infraccion = '00.48' THEN '00.30' ELSE
      CASE WHEN @codigo_infraccion = '00.50' THEN '00.38' ELSE @codigo_infraccion END END END END
      + @codigo_infraccion
   SET @tipoinfr = substring (@codigo_infraccion, 1, 5)

   UPDATE coactivo.deuda_h_varios
   SET codigo = @codigo,preimpreso = @preimpreso,anno_multa = @anno_multa,numero_multa = @numero_multa,fecha_multa = @fmulta,
      anno_area = @anno_area,codigo_area = @codigo_area,tipo_infraccion = @tipo_infraccion,
      codigo_infraccion = substring (@codigo_infraccion, 6, 5),codigo_adicional = @codigo_adicional,monto_multa = @monto_multa,
      antecedente = @antecedente,numero_notificacion = @numero_notificacion,estado = @estado,cantidad = @cantidad,
      codigo_autoridad_municipal = @codigo_autoridad_municipal,base = @base,factor = @factor,fecha_notificacion = @fecha_notificacion,
      glosa = @glosa,usuario_id_mod = @usuario_id_mod,fecha_mod = getdate (),ip_mod = @ip_mod,e_resolucion = @e_resolucion,
      fech_notificacion2 = @fech_notificacion2,n_resolucion = @n_resolucion,glosa_notificacion = @glosa_notificacion,numero_licencia = @t_vehiculo
   WHERE numero_multa = @numero_multa

   IF EXISTS (SELECT * FROM Caja.Mrecibos WHERE codigo = @codigo AND ANNO = @anno_multa AND rtrim (ltrim (NUM_DOCU)) = rtrim (ltrim (@numero_multa)))
   BEGIN
      UPDATE Caja.Mrecibos
      SET imp_insol = @monto_multa,
         imp_reaj = @monto_multa,
         fec_venc = @fmulta,
         tipo = @tipoinfr,
         tipo_rec = substring (@codigo_infraccion, 6, 5),
         operador = @operador,
         estacion = @estacion
      WHERE codigo = @codigo AND ANNO = @anno_multa AND rtrim (ltrim (NUM_DOCU)) = rtrim (ltrim (@numero_multa))
         AND estado = '0' AND SUBSTRING (UBICA, 1, 2) = 'EM'
   END
   ELSE
   BEGIN
      INSERT INTO caja.mrecibos (
         codigo,anno,cod_pred,anexo,sub_anexo,tipo_docu,num_docu,tipo,tipo_rec,periodo,
         imp_insol,fact_reaj,imp_reaj,fact_mora,mora,costo_emis,observacion,estado,ubica,fec_venc,
         fec_pago,num_ingr,operador,estacion,fech_ing)
      VALUES (right (
         '0000000' + cast (cast (@codigo AS INT) AS VARCHAR (7)),7),@anno_multa,'','','','',@numero_multa,'90.29','90.31','01',
         @monto_multa,1.00,@monto_multa,0.00,0.00,0.00,'','0','EM',CONVERT (VARCHAR (10), @fecha_notificacion, 103),getdate (),
         '0',@OPERADOR,@estacion,getdate ())
   END
   SELECT '1'
   RETURN
end

selec_editar: -- exec rentas.sp_multasadmin @busc='5',@numero_multa='0000035839'
begin
   SELECT ma.codigo,ma.preimpreso,ma.anno_multa,ma.numero_multa,ma.serie,CONVERT (VARCHAR (10), ma.fecha_multa, 103) fecha_multa,
      ma.anno_area,ma.codigo_area,ma.tipo_infraccion,ma.codigo_infraccion,ma.codigo_adicional,ma.monto_multa,ma.antecedente,
      ma.numero_notificacion,ma.estado,ma.numero_recibo,ma.anno_multa,ma.obligacion_id,ma.cantidad,ma.codigo_autoridad_municipal,
      ma.base,ma.factor,CONVERT (VARCHAR (10), ma.fecha_notificacion, 103)AS fecha_notificacion,ma.glosa,ma.e_resolucion,
      CONVERT (VARCHAR (10), ma.fech_notificacion2, 103)AS fecha_notificacion2,ma.n_resolucion,ma.glosa_notificacion,
      tipo_infrac =(SELECT monto_aplicacion
                     FROM ma_m_tabla_general_infracciones
                     WHERE     codigo_area = ma.codigo_area
                     AND anno_area = ma.anno_area
                     AND tipo_infraccion = ma.tipo_infraccion
                     AND codigo_infraccion = ma.codigo_infraccion
                     AND codigo_adicional = ma.codigo_adicional),
      t_vehiculo = isnull (ma.numero_licencia, '')
   FROM coactivo.deuda_h_varios ma
   WHERE numero_multa = @numero_multa AND ma.codigo = @codigo

   --where numero_multa='0000035849' and ma.codigo='0000001'
   RETURN
end

msdelete:
begin
   UPDATE coactivo.deuda_h_varios
   SET estadomulta = '0'
   WHERE numero_multa = @numero_multa

   UPDATE caja.Mrecibos
   SET estado = '2'
   WHERE codigo = @codigo AND tipo = '90.29' AND tipo_rec = '90.31' AND num_docu = @numero_multa

   --delete from coactivo.deuda_h_varios where numero_multa=@numero_multa
   SELECT '1'
   RETURN
end 

cmbAutoridadMunicipal:
begin
   SELECT codigo_autoridad, codigo_area + '-' + descripcion
   FROM ma_m_autoridad_municipal
   WHERE FLAG = 1
   ORDER BY descripcion
   RETURN
end

cmbAreasMunicipales:                                            --primer combo
begin
   SELECT codigo_area codigo, codigo_area + ' - ' + descripcion descripcion
   FROM ma_m_areas_municipales
   WHERE ESTADO = 1
   RETURN
end

cmbEstado:
begin
   SELECT codigo_estado, descripcion FROM ma_e_estado_multa
   RETURN
end

cmbtupa:
begin

   --set @codigo_area = '4444'
   IF @codigo_area = '4004'
   BEGIN
      SELECT tipo, concepto
      FROM Caja.Tipo_Ingresos_Det
      WHERE flagdeuda IN ('2', '3') AND tipo <> '30.82'
      ORDER BY concepto
   END
   ELSE
   BEGIN
      --  SELECT tipo,concepto FROM Caja.Tipo_Ingresos_Det where flagdeuda in ('1','3')  and tipo<>'30.82'  order by concepto
      SELECT tipo, concepto
      FROM Caja.Tipo_Ingresos_Det
      WHERE flagdeuda IN ('1', '3')
      ORDER BY concepto
   END
RETURN
end

cmbtupatodos:
begin
   SELECT tipo, concepto
   FROM Caja.Tipo_Ingresos_Det
   WHERE flagdeuda IN ('1', '2', '3') AND tipo <> '30.82'
   ORDER BY concepto

   RETURN
end