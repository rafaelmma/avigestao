//Ola! Se voce procura pelo local de armazenamento das midias, lembre-se de
//que elas estao protegidas pela lei de direitos autorias do Brasil

function atualizarDialogFavoritos(idMidia, isIndicacao) {
  $('#wa_modallistas .modal-body')
    .html('<br><br><center>' + $('.wa-spinner').html() + '</center><br><br>')
    .load('/getListasMidiaDialog.php?m=' + idMidia + '&i=' + isIndicacao, function () {});
}

wikiaves.midia = {
  initCurtidas: function () {
    if ($('body > #wa_curtidas').length) {
      $('#wa-detalhes #wa_curtidas').remove();
    } else {
      $('#wa-detalhes #wa_curtidas').appendTo('body');
    }

    $('.wa-botao-curtir a.wa-likelink:not(.wa-ok)')
      .click(function (e) {
        var o = $(this).parent();

        if (o.hasClass('likeNot')) return false;
        if (o.hasClass('likeYes')) {
          o.addClass('likeNo').removeClass('likeYes');
          $(this).attr('data-original-title', $(this).attr('textoLike'));
        } else {
          o.addClass('likeYes').removeClass('likeNo');
          $(this).attr('data-original-title', $(this).attr('textoDislike'));
        }
        var idMidia = o.attr('midia');
        o.find('.wa-likes').load('/getCurtirMidia.php?id=' + idMidia);

        return false;
      })
      .addClass('wa-ok');
  },

  initIndicacoes: function () {
    if ($('body > #wa_modallistas').length) {
      $('#wa-detalhes #wa_modallistas').remove();
    } else {
      if ($('#wa-detalhes #wa_modallistas').length) {
        $('#wa-detalhes #wa_modallistas').appendTo('body');
      }
    }

    $('.wa-botao-curtir a.wa-likes:not(.wa-ok), .wa-botao-indicar a.wa-indics:not(.wa-ok)')
      .click(function (e) {
        var o = $(this).parent();
        var idMidia = o.attr('midia');
        $('#wa_curtidas')
          .modal('show')
          .on('hidden.bs.modal', function () {
            if ($('#wa-detalhes').length > 0) {
              $('body').addClass('modal-open');
            }
          });
        $('#wa_curtidas .modal-body').load('/getLikesListasMidia.php?m=' + idMidia, function () {});

        return false;
      })
      .addClass('wa-ok');

    //Botão Indicar
    $('.wa-botao-indicar a.wa-likelink:not(.wa-ok)')
      .click(function (e) {
        var o = $(this).parent();

        if (o.hasClass('pinNot')) return false;

        $('#wa_modallistas .modal-body').html(
          '<br><br><center>' + $('.wa-spinner').html() + '</center><br><br>',
        );
        $('#wa_modallistas').modal('show');

        return false;
      })
      .addClass('wa-ok');

    $('#wa_modallistas:not(.wa-ok)')
      .on('shown.bs.modal', function () {
        var idm = $('.wa-botao-indicar').attr('midia');
        atualizarDialogFavoritos(idm, 1);
      })
      .on('hidden.bs.modal', function () {
        var idm = $('.wa-botao-indicar').attr('midia');

        $.ajax({
          url: '/getBotoesLikeListas.php?m=' + idm,
        }).done(function (html) {
          $('.wa-botao-indicar').replaceWith(html);
          wikiaves.midia.initIndicacoes();
        });

        if ($('#wa-detalhes').length > 0) {
          $('body').addClass('modal-open');
        }
      })
      .addClass('wa-ok');
  },

  initDenunciar: function () {
    if ($('body > #wa_modaldenuncia').length) {
      $('#wa-detalhes #wa_modaldenuncia').remove();
    } else {
      if ($('#wa-detalhes #wa_modaldenuncia').length) {
        $('#wa-detalhes #wa_modaldenuncia').appendTo('body');
      }
    }

    // Botão Denunciar
    $('.wa-denunciar:not(.wa-ok)')
      .click(function () {
        $('#wa_modaldenuncia')
          .modal('show')
          .on('hidden.bs.modal', function () {
            if ($('#wa-detalhes').length > 0) {
              $('body').addClass('modal-open');
            }
          });
        $('#wa_modaldenuncia .modal-body')
          .html($('.wa-spinner').html())
          .load('/getDenunciarAbuso.php');
        return false;
      })
      .addClass('wa-ok');

    $('#wa_salvardenuncia:not(.wa-ok)')
      .click(function () {
        var tipoNaoConformidade = $('#wa_modaldenuncia #tipoNaoConformidade').val();
        var relato = $('#wa_modaldenuncia #relato').val();
        $('#divAviso').html('').height('auto');
        var idmidia = $('.wa-record-detalhes').attr('idmidia');

        $.post(
          '/getIncluirSugestaoCorrecao.php',
          { t: tipoNaoConformidade, r: relato, m: idmidia },
          function (data) {
            $('#divAviso').html(data);
            var content = {};
            content.message = data;

            var notify = $.notify(data, {
              type: 'success',
              allow_dismiss: true,
              newest_on_top: false,
              mouse_over: true,
              showProgressbar: false,
              spacing: 20,
              timer: 3000,
              placement: {
                from: 'top',
                align: 'right',
              },
              offset: {
                x: 30,
                y: 90,
              },
              delay: 1000,
              z_index: 10000,
              animate: {
                enter: 'animated fadeInDown',
                exit: 'animated bounce',
              },
            });
          },
        );
        $('#wa_modaldenuncia').modal('hide');
        return false;
      })
      .addClass('wa-ok');
  },
  initLinks: function () {
    $('#wa-detalhes a').attr('target', '_blank');
    $('#wa-detalhes [data-toggle="m-tooltip"]').each(function () {
      mApp.initTooltip($(this));
    });
    if (typeof a2a !== 'undefined') {
      a2a.init('page', {
        target: '.wa-compartilhar',
      });
    }
  },
  initMapaOcorrencias: function () {
    var p = $('#wa-pontomapa');
    if (p.length) {
      var mapa = p.parent().find('#imgMapa');
      var prop = 599 / 559;
      var largura = mapa.innerWidth();
      var altura = largura / prop;
      var propx = 599 / largura;
      var propy = 559 / altura;
      posx = p.attr('posx') / propx - 7;
      posy = p.attr('posy') / propy + 5;
      p.css('left', posx + 'px');
      p.css('top', posy + 'px');
      p.show();
    }
  },
  initPlayer: function () {
    var $player = $('#wa-player');
    if ($player) {
      var spectro = $player.attr('spectrogram');
      wikiaves.player.init('#som.wikiaves-player', {
        spectrogram: spectro,
        audioWidth: 600, // width of audio player
        audioHeight: 40, // height of audio player
        startVolume: 0.5, // initial volume when the player starts
        timerRate: 50,
        features: [
          'playpause',
          'current',
          'progress',
          'duration',
          'tracks',
          'volume',
          'fullscreen',
        ],
      });
      $player.fadeIn();
    }
  },

  //carrega os tocadores da página
  init: function () {
    wikiaves.midia.initCurtidas();
    wikiaves.midia.initIndicacoes();
    wikiaves.midia.initDenunciar();
    wikiaves.midia.initLinks();
    wikiaves.midia.initMapaOcorrencias();
    wikiaves.midia.initPlayer();
  },
};

$(document).ready(function () {
  wikiaves.midia.init();
});

/* Comentários ------------*/

jQuery.fn.protectImage = function (settings) {
  settings = jQuery.extend(
    {
      image: 'img/ponto.gif',
      zIndex: 10,
    },
    settings,
  );
  return this.each(function () {
    var position = $(this).offset();
    var height = $(this).outerHeight();
    var width = $(this).outerWidth();
    $('<img />')
      .attr({
        width: width,
        height: height,
        src: settings.image,
      })
      .addClass('protectedImage')
      .css({
        border: '0px solid #fff',
        top: position.top,
        left: position.left,
        position: 'absolute',
        zIndex: settings.zIndex,
      })
      .appendTo('body');
  });
};

function scrollToComments() {
  var aTag = $("a[name='comentarios']");
  var atop = aTag.offset().top;

  if ($('#wa-detalhes').length > 0) {
    var aModal = $('.wa-modal');
    var atopModal = aModal.offset().top * -1;
    $('#wa-detalhes').animate({ scrollTop: atopModal + atop }, 'slow');
  } else {
    $('body, html').animate({ scrollTop: atop }, 'slow');
  }
}

function configParaTodos() {
  var lblPara = $('#lblPara');
  var chkPara = $('#chkPara');
  var donoMidia = chkPara.attr('isdonomidia') == 1;
  lblPara.html(chkPara.attr('paratodos'));
  chkPara.attr('disabled', !donoMidia);

  $('#idComentarioResposta').val('');
  if (donoMidia) $('#divPara').show();
  else $('#divPara').hide();
}

function reloadRecord() {
  if (typeof $currRecord !== 'undefined' && $currRecord.length > 0) {
    loadRecord($currRecord);
  } else {
    location.reload();
  }
}

var ConfigComentarios = {
  configControlesComentario: function ($e) {
    $e.find('.wa-botao-responder').click(function () {
      var $comentarioResposta = $(this).parents('.wa-comentario');
      var idComentario = $comentarioResposta.attr('id');
      var nomeAutor = $comentarioResposta.find('.m-messenger__message-username .m-link').html();
      var msgPara = textoResponderPara + ' ' + nomeAutor;
      var lblPara = $('#lblPara');
      var chkPara = $('#chkPara');

      $('#wa_listacomentarios #wa_novaresposta').remove();
      $formResposta = $($('.wa-template-resposta').html());
      $formResposta.insertAfter($comentarioResposta).slideDown('slow');
      $('#wa_listacomentarios #wa_novaresposta #idComentarioResposta').val(idComentario);

      $('#wa_listacomentarios .wa-cancelar-resposta').click(function () {
        //$('#wa_listacomentarios #wa_novaresposta').remove();
        $('#wa_listacomentarios #wa_novaresposta').slideUp('fast', function () {
          $('#wa_listacomentarios #wa_novaresposta').remove();
        });
      });

      var t = $('#wa_listacomentarios #wa_comentario_resposta');
      autosize(t), autosize.update(t);
      t.focus();

      $('#wa_listacomentarios .wa-salvar-resposta').click(function (e) {
        e.preventDefault();
        if ($('#wa_listacomentarios #wa_comentario_resposta').val().trim() == '') {
          //notificarErro($('#comentario').attr('wa-empty-error'));
          return;
        }

        if (!$(this).hasClass('m-loader')) {
          $(this).addClass('m-loader m-loader--light m-loader--left');
          $.post(
            'getManterComentarioMidia.php',
            $('#wa_listacomentarios #comentarioformResposta').serialize(),
          ).done(function (data) {
            $('.wa-salvar-resposta').removeClass('m-loader m-loader--light m-loader--left');
            var result = $(data);

            if (result.hasClass('wa-comentario')) {
              $('.wa-sem-comentarios').remove();
              result.hide().insertAfter('#wa_listacomentarios #wa_novaresposta').fadeIn('slow');
              result.find('.m-messenger__message-content').addClass('wa-comentario-pulse');
              $('#wa_listacomentarios #wa_novaresposta').remove();

              ConfigComentarios.configControlesComentarios();
            }
          });
        }
      });
    });

    $e.find('.wa-botao-concordar').click(function () {
      var $sugestao = $(this).parent().find('.wa-sugestaoid');

      $('#sexo').val($sugestao.attr('sexo'));
      $('#idade').val($sugestao.attr('idade'));
      $('#especiesugerida').val($sugestao.find('.m-link i').text());
      $('#especiesugerida_hidden').val($sugestao.attr('sp'));
      $('#especiesugerida_nome').html($sugestao.find('.m-link span').text());
      $('#sexo').attr('disabled', false);
      $('#idade').attr('disabled', false);
      $('.wa-formsugestaoid').show();
      $('#wa_sugeririd').hide();
      scrollToComments();
    });

    $e.find('.wa-botao-aceitar').click(function () {
      var idmidia = $('.wa-record-detalhes').attr('idmidia');
      var idComentario = $(this).parents('.wa-comentario').attr('id');
      $(this).addClass('m-loader m-loader--brand m-loader--left');

      $.post('getAceitarSugestaoComentarioMidia.php', {
        idMidia: idmidia,
        idComentarioSugestao: idComentario,
      }).done(function (data) {
        var retorno = data.retorno;
        if (retorno.ok == 1) {
          reloadRecord();
          scrollModalTop();
        }
      });
    });

    $e.find('.edtCom').click(function (e) {
      var idComentario = $(this).parents('.wa-comentario').attr('id');

      mApp.block('.wa-comentario#' + idComentario + ' .wa-comentario-body', {});

      $('.wa-comentario#' + idComentario + ' .m-messenger__message').addClass('wa-comentario-fill');

      var editBody = document.createElement('div');
      editBody.className = 'wa-comentario-edit';
      var editText = document.createElement('div');
      editText.className = '';
      $(editBody).append(editText);
      $('.wa-comentario#' + idComentario + ' .wa-comentario-body').append(editBody);
      $(editText).load('getEditarComentarioForm.php?id=' + idComentario, function () {
        $('.wa-comentario#' + idComentario + ' .wa-comentario-texto').hide();
        mApp.unblock('.wa-comentario#' + idComentario + ' .wa-comentario-body');
      });
      return false;
    });

    $e.find('.excCom').click(function (e) {
      e.preventDefault();
      var idComentario = $(this).parents('.wa-comentario').attr('id');

      swal({
        title: textoTemCertezaDesejaExcluir,
        text: textoNaoSeraPossivelReverter,
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: textoSimExcluir,
        cancelButtonText: textoCancelar,
      }).then(function (result) {
        if (result.value) {
          mApp.block('.wa-comentario#' + idComentario + ' .wa-comentario-body', {});

          $.post('getExcluirComentarioMidia.php', { idComentario: idComentario }).done(function (
            data,
          ) {
            if ($('.wa-comentario#' + idComentario).has('.wa-sugestaoid')) {
              reloadRecord();
            }

            mApp.unblock('.wa-comentario#' + idComentario + ' .wa-comentario-body');
            var retorno = data.retorno;
            if (retorno.ok == 1) {
              $('.wa-comentario#' + idComentario).remove();
              if (result.value) {
                swal(textoExcluido, textoComentarioFoiExcluido, 'success');
              }
            } else {
              notificarErro(retorno.erro);
            }
          });
        }
      });
      return false;
    });
  },

  configControlesComentarios: function () {
    $('.wa-comentario:not(.wa-ok)')
      .each(function () {
        ConfigComentarios.configControlesComentario($(this));
      })
      .addClass('wa-ok');
  },

  init: function () {
    !(function () {
      var t = $('#comentario');
      autosize(t), autosize.update(t);
    })();

    $('#wa_sugeririd').click(function () {
      $('.wa-formsugestaoid').show();
      $(this).hide();
      $('#especie').focus();
    });

    $('#enviarComentario').click(function (e) {
      e.preventDefault();
      if ($('#comentario').val().trim() == '' && $('#especie_hidden').val() == '') {
        //notificarErro($('#comentario').attr('wa-empty-error'));
        return;
      }

      if (!$(this).hasClass('m-loader')) {
        $(this).addClass('m-loader m-loader--light m-loader--left');
        $.post('getManterComentarioMidia.php', $('#comentarioform').serialize()).done(function (
          data,
        ) {
          $('#enviarComentario').removeClass('m-loader m-loader--light m-loader--left');
          var result = $(data);

          if ($('#especie_hidden').val() != '') {
            reloadRecord();
          } else {
            if (result.hasClass('wa-comentario')) {
              $('.wa-sem-comentarios').remove();
              result.hide().prependTo('#wa_listacomentarios .m-messenger__messages').fadeIn('slow');
              result.find('.m-messenger__message-content').addClass('wa-comentario-pulse');
              $('#comentario').val('');
              $('#especie').val('');
              $('#especie_hidden').val('');
              $('#sexo').val('I');
              $('#idade').val('I');
              scrollToComments();
              $('.wa-formsugestaoid').hide();
              $('#wa_sugeririd').show();
              ConfigComentarios.configControlesComentarios();
            }
          }
        });
      }
    });

    $('#wa_exibirtodos button').click(function () {
      var idmidia = $(this).attr('idmidia');
      $('#wa_exibirtodos').html(
        '<div class="wa-spinner" style="display:table"><div class="wa-spinner" style="display:none"><div id="spinner1" class="m-spinner m-spinner--danger m-spinner--sm"></div><div id="spinner2" class="m-spinner m-spinner--warning m-spinner--sm"></div><div id="spinner3" class="m-spinner m-spinner--success m-spinner--sm"></div><div id="spinner4" class="m-spinner m-spinner--primary m-spinner--sm"></div></div></div>',
      );

      $.post('getTodosComentariosMidia.php', { idMidia: idmidia }).done(function (data) {
        $('#wa_listacomentarios').html(data);
        ConfigComentarios.configControlesComentarios();
      });
    });

    $('#especiesugerida').on('typeahead:select', function (e, datum) {
      console.log(datum);
      if (datum.ds == 1) {
        $('#sexo').prop('disabled', false);
      } else {
        $('#sexo').val('I');
        $('#sexo').prop('disabled', true);
      }
      $('#idade').prop('disabled', false);
    });

    $('#especiesugerida').blur(function (e) {
      if (e.target.value == '') {
        $('#' + e.target.name + '_hidden').val('');
        $('#especiesugerida_nome').html('');
        $('#sexo').attr('disabled', true);
        $('#idade').attr('disabled', true);
      }
    });

    $('#chkPara').click(function (e) {
      if (!$(this).prop('checked')) configParaTodos();
    });
    ConfigComentarios.configControlesComentarios();
    configParaTodos();
  },
};
