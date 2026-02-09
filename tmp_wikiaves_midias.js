var current_page_url = '';
var xDown = null;
var yDown = null;
var parametros = '';
var iso = null;
var clicouNext = false;
var pendingCards = [];
var doneCards = [];
var nextCard = 0;
var isMobile = false;
var $currRecord = null;
var $prevRecord = null;
var $nextRecord = null;
var $ajaxLoader = null;
var prevScrollPos = 0;

function addSwipeListener() {
  document.addEventListener('touchstart', handleTouchStart, false);
  document.addEventListener('touchmove', handleTouchMove, false);
  document.addEventListener('touchend', handleTouchEnd, false);
}
function removeSwipeListener() {
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
}

function handleTouchStart(evt) {
  xDown = evt.touches[0].clientX;
  yDown = evt.touches[0].clientY;
}

function handleTouchEnd(evt) {
  if (!xDown || !yDown) {
    return;
  }

  var xUp = evt.changedTouches[0].clientX;
  var yUp = evt.changedTouches[0].clientY;

  var xDiff = xDown - xUp;
  var yDiff = yDown - yUp;

  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    /*most significant*/
    if (xDiff > 0) {
      if (xDiff > 100) {
        /* left swipe */ goNext();
      }
    } else {
      if (xDiff < -100) {
        /* right swipe */ goPrevious();
      }
    }
  } else {
    if (yDiff > 0) {
      /* up swipe */
    } else {
      /* down swipe */
    }
  }
  /* reset values */
  xDown = null;
  yDown = null;
}

function handleTouchMove(evt) {
  /*    
		if ( ! xDown || ! yDown ) {
				return;
		}

		var xUp = evt.touches[0].clientX;                                    
		var yUp = evt.touches[0].clientY;

		var xDiff = xDown - xUp;
		var yDiff = yDown - yUp;

		if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {
				if ( xDiff > 0 ) {
                    if(xDiff > 15) 
                    {
						 goNext();
                    }
				} else {
                    if(xDiff < -15) 
                    {
						 goPrevious();
                    }
				}
		} else {
				if ( yDiff > 0 ) {
						/ up swipe / 
				} else { 
						/ down swipe /
				}
		}

		xDown = null;
		yDown = null;
*/
}

function notificarErro(mensagem) {
  var content = {};
  content.message = mensagem;
  content.icon = 'icon fa fa-warning';

  var notify = $.notify(content, {
    type: 'danger',
    allow_dismiss: false,
    newest_on_top: true,
    spacing: 10,
    timer: 2000,
    placement: {
      from: 'top',
      align: 'right',
    },
    offset: {
      x: 30,
      y: 30,
    },
    delay: 1000,
    z_index: 10000,
    animate: {
      enter: 'animated fadeInDown',
      exit: 'animated fadeOutUp',
    },
  });
}

function getPreviousRecord($currentRecord) {
  var $prev = $currentRecord.parent().prev().find('.wa-record').first();
  if (!$prev || !$prev.length) {
    $prev = $currentRecord.prev();
  }

  if ($prev && $prev.length && $prev.is(':visible')) {
    return $prev;
  }
  return null;
}
function getNextRecord($currentRecord) {
  var $parent = $currentRecord.parent();
  var $next = $parent.next().find('.wa-record').first();
  if (!$next || !$next.length) {
    $next = $currentRecord.next();
  } else {
    var nextCount = $parent.nextAll().length;
    if (nextCount <= 3) {
      LoadItems(); // Carrega automaticamente se o usuário estimer navegando nas setas do modal
    }
  }

  if ($next && $next.length && $next.is(':visible')) {
    return $next;
  }

  return null;
}

function goPrevious() {
  $('.wa-nav-prev').click();
}

function goNext() {
  $('.wa-nav-next').click();
}

function scrollModalTop() {
  $('#wa-detalhes').animate(
    {
      scrollTop: 0,
    },
    600,
  );
}

function getImageURL($record) {
  var g = $record.attr('grande') == 'T' ? 'g' : '';
  if (isMobile) {
    g = '';
  }
  var auxLink = $record.find('.img-responsive').attr('src');
  auxLink = auxLink.replace('q.jpg', g + '.jpg');
  auxLink = auxLink.replace('q_', g + '_');
  return auxLink;
}

function loadRecord($record) {
  if (!$record || !$record.length) return;
  var me = $(this);
  if ($ajaxLoader != null) {
    $ajaxLoader.abort();
    $ajaxLoader = null;
  }

  var waid = $record.attr('idmedia');
  $('.wa-nav-next, .wa-nav-prev, .protectedImage').remove();

  var isSom = $record.hasClass('wa-som');

  if (isSom) {
    $('.wa-nav-spinner').show();
  } else {
    var auxLink = getImageURL($record);

    var htmlPreload =
      '<div class="m-content"><div class="wa-image-wrapper" style="width:100%"><div class="image-container wa-record-container wa-ok">';
    htmlPreload +=
      '<img border="0" id="wa-foto" class="img-responsive wa-ok" src="' + auxLink + '">';
    htmlPreload += '<div class="image-wrapper"></div></div></div>';
    htmlPreload += '<br><div class="wa-spinner text-center">';
    htmlPreload += '	<div id="spinner1" class="m-spinner m-spinner--danger m-spinner--sm"></div>';
    htmlPreload += '	<div id="spinner2" class="m-spinner m-spinner--warning m-spinner--sm"></div>';
    htmlPreload += '	<div id="spinner3" class="m-spinner m-spinner--success m-spinner--sm"></div>';
    htmlPreload += '	<div id="spinner4" class="m-spinner m-spinner--primary m-spinner--sm"></div>';
    htmlPreload += '</div></div>';

    $('#wa-detalhes .modal-body').html(htmlPreload);
  }
  $(document).ready(function () {
    $('#wa-foto').css('max-height', $(window).height() - 70 + 'px');
  });

  if ($('#wa-detalhes .modal-body #wa-record-content').length > 0) {
    $('#wa-detalhes .modal-body').fadeTo('fast', 0.9, function () {
      // Animation complete.
    });
  }

  $ajaxLoader = $.ajax({
    url: '_midia_detalhes.php?m=' + waid + (isMobile ? '&mob=1' : ''),
  }).done(function (html) {
    if ($record.attr('idmedia') != waid) return;

    var inidiv = '<div id="wa-record-content" style="display:none">';
    var enddiv = '</div';

    $('#wa-detalhes .modal-body').html(inidiv + html + enddiv);
    var n = $('#wa-detalhes .modal-body #wa-record-content').length;

    if (n > 1) {
      $('#wa-detalhes .modal-body #wa-record-content').first().remove();
    }
    $('#wa-detalhes .modal-body #wa-record-content').show();
    $('#wa-detalhes .modal-body').fadeTo('fast', 1, function () {
      // Animation complete.
    });
    $('.wa-nav-spinner').hide();
    wikiaves.midia.init();
    history.pushState(null, null, waid);
    $ajaxLoader = null;
  });

  $prevRecord = getPreviousRecord($record);
  if ($prevRecord && $prevRecord.length) {
    var nextButton = document.createElement('div'); // Create with DOM
    nextButton.className = 'wa-nav-prev m-btn btn m-btn--air';
    nextButton.innerHTML = '<i class="la la-arrow-left"></i>';
    $('body').append(nextButton);

    $(nextButton).click(function () {
      clicouNext = true;
      loadRecord($prevRecord);
      scrollModalTop();
    });
  }

  $nextRecord = getNextRecord($record);
  if ($nextRecord && $nextRecord.length) {
    var isFoto = $nextRecord.hasClass('wa-foto');
    if (isFoto && clicouNext) {
      var srcNext = getImageURL($nextRecord);
      var img = new Image();
      img.src = srcNext;
    }
    var nextButton = document.createElement('div'); // Create with DOM
    nextButton.className = 'wa-nav-next m-btn btn m-btn--air';
    nextButton.innerHTML = '<i class="la la-arrow-right"></i>';
    $('body').append(nextButton);
    $(nextButton).click(function () {
      clicouNext = true;
      loadRecord($nextRecord);
      scrollModalTop();
    });
  }
  $currRecord = $record;
}

function addDoneCard(doneCard) {
  if (doneCards.indexOf(doneCard) >= 0) {
    return;
  }

  doneCards.push(doneCard);

  if (pendingCards.length > 0) {
    for (i = nextCard; i < pendingCards.length; i++) {
      var encontrado = false;
      var card = pendingCards[i];
      for (j = 0; j < doneCards.length; j++) {
        if (doneCards[j] == card) {
          encontrado = true;
          var $item = $(card);
          $item.show();
          var $grid = $('.wa-record-grid');
          $grid.append($item);
          $grid.isotope('appended', $item);
          $grid.isotope('layout');
          delete doneCards[j];
        }
      }
      if (encontrado) {
        delete pendingCards[i];
        nextCard++;
        if (pendingCards.length == doneCards.length) {
          $('.wa-loading-records').hide();
        }
      } else break;
    }
  }
}

function onClickGridItem(e) {
  var $t = $(e.target);
  if ($t.parents('.wikiaves-player').length > 0) {
    e.preventDefault();
    return;
  }
  if (!$t.is('A')) {
    $('#wa-detalhes').modal('show');
    current_page_url = window.location.href;
    $('#wa-detalhes .modal-body').empty();
    clicouNext = false;
    loadRecord($(this));
    addSwipeListener();
  }
}

function printRecord(rec) {
  var classe = 'sp';
  if (rec.sp.id == '0') {
    classe = 'ni';
  }
  var htmlMidia = '';
  var isFoto = rec.tipo == 'F';
  var isSom = rec.tipo == 'S';
  var auxLink = rec.link;
  if (isFoto) {
    if (isMobile) {
      auxLink = auxLink.replace('#.jpg', 'q.jpg');
      auxLink = auxLink.replace('#_', 'q_');
    } else {
      auxLink = auxLink.replace('#.jpg', 'q.jpg');
      auxLink = auxLink.replace('#_', 'q_');
    }
    htmlMidia =
      '<a href="/' +
      rec.id +
      '&' +
      parametros +
      '" onclick="return false"><img class="img-responsive" src="' +
      auxLink +
      '"></a>';
  } else {
    auxLinkQ = auxLink.replace('#_', 'q_');
    auxLink = auxLink.replace('#_', '_');
    auxLink = auxLink.replace('.jpg', '.mp3');

    htmlMidia += '<div class="wa-espec">';
    htmlMidia +=
      '<div style="padding: 6px 10px 5px 10px;color: #aaa;font-size: 0.85em;"><div style="float:right">' +
      rec.dura +
      '</div>WA' +
      rec.id +
      '</div>';
    htmlMidia +=
      '<div class="d-none d-sm-block" style="margin:13px 10px 10px 10px"><img src="/img/legendasom.svg" style="max-width:220px;max-height:40px;min-height:38px;margin-left:auto;margin-right:auto;display:table" onerror="this.onerror=null; this.src=\'/img/legendasom.png\'"></div>';
    htmlMidia +=
      '<a href="/' +
      rec.id +
      '&' +
      parametros +
      '" onclick="return false"><img class="img-responsive d-none d-sm-block" src="' +
      auxLinkQ +
      '"></a>';
    htmlMidia += '</div>';
    htmlMidia += '<div class="wa-player progression-small2">';
    htmlMidia += '<div class="responsive-wrapper responsive-audio">';
    htmlMidia +=
      '<audio id="wa-player-' +
      rec.id +
      '" class="mejs-container svg wikiaves-player progression-single progression-skin progression-minimal-dark progression-audio-player mejs-audio" controls="controls" preload="none">';
    htmlMidia += ' <source src="' + auxLink + '" type="audio/mp3"/>';
    htmlMidia += '</audio></div></div>';
    htmlMidia += '<script type="text/javascript"> ';
    htmlMidia += '		wikiaves.player.init("#wa-player-' + rec.id + '", { ';
    htmlMidia += '			audioWidth: 100,  ';
    htmlMidia += '			audioHeight: 40,  ';
    htmlMidia += '			startVolume: 0.8,  ';
    htmlMidia += "			audioVolume: 'vertical', ";
    htmlMidia += "			base: '" + rec.base + "', ";
    htmlMidia += "			features: ['playpause','current','progress','volume'] ";
    htmlMidia += '		});	';
    htmlMidia += '	</script> ';
  }

  nome = rec.sp.nome;
  if (nome == '') nome = '&nbsp;';
  var nvt = rec.sp.nvt;
  if (rec.is_questionada) nvt = '<del>' + nvt + '</del>';
  var s = ''; // HTML string
  s +=
    '	<div class="m-portlet fadeInUp animated wa-record m-portlet--rounded wa-record-mobile' +
    (isFoto ? ' wa-foto' : ' wa-som') +
    '" id="WA' +
    rec.id +
    '" href="_midia_detalhes.php?m=' +
    rec.id +
    '" idmedia="' +
    rec.id +
    '" data-target="#wa-detalhes" grande="' +
    rec.grande +
    '" >';
  s += htmlMidia;
  s += '		<div class="m-portlet__body wa-nowrap">';
  s +=
    '			<div class="' +
    classe +
    ' font-poppins"><a class="m-link" href="/wiki/' +
    rec.sp.idwiki +
    '">' +
    nvt +
    '</a><br><a class="m-link" href="/wiki/' +
    rec.sp.idwiki +
    '"><i>' +
    nome +
    '</i></a></div>';
  s +=
    '			<div class="author"><a class="m-link" href="/municipio_' +
    rec.idMunicipio +
    '">' +
    rec.local +
    '</a><br>' +
    rec.por +
    ' <a class="m-link" href="/perfil_' +
    rec.perfil +
    '">' +
    rec.autor +
    '</a></div>';
  s += '			<div class="date">' + rec.data + '</div>';
  s += '			<div class="actions">';
  s += '				<i class="fa fa-eye"></i>&nbsp;' + rec.vis + '&nbsp;&nbsp;&nbsp;';
  s += '				<i class="fa fa-comments"></i>&nbsp;' + rec.coms + '&nbsp;&nbsp;&nbsp;';
  s += '				<i class="fa fa-star"></i>&nbsp;' + rec.likes + '&nbsp;&nbsp;&nbsp;';
  s += '			</div>';
  s += '		</div>';
  s += '	</div>';

  var griditem = document.createElement('div'); //<div class="grid-item"></div>
  griditem.className = 'wa-grid-item wa-record-mobile';
  griditem.innerHTML = s;

  /*
	var $item = $(griditem);
	$item.show();
	var $grid = $('.wa-record-grid');
	$grid.append($item);	
	$grid.isotope('appended', $item);
	$grid.isotope('layout');
	*/

  //if(isFoto)
  if (true) {
    $(griditem).hide();
    pendingCards[pendingCards.length] = griditem;

    $(griditem)
      .imagesLoaded()
      .progress(function (imgLoad, griditem) {
        var $item = $(griditem.img).parents('.wa-grid-item');
        addDoneCard($item.get(0));
      });
  } else {
    pendingCards[pendingCards.length] = griditem;
    addDoneCard(griditem);
  }

  // Adiciona o evento de click...
  $(griditem).find('.wa-record').click(onClickGridItem);
}

var loading = false;
var page = 1;

function LoadItems() {
  if (loading) return;
  $('.wa-loading-records').show();
  loading = true;
  $.getJSON('/getRegistrosJSON.php?' + parametros + '&p=' + page, function (data) {
    var r = data.registros;
    var count = Object.keys(r.itens).length;
    if (count == 0) {
      $('.wa-loading-records').hide();
      return;
    }

    $('.wa-registros-titulo').html(r.titulo);
    $('#wa-registros-total').html(r.total);

    $.each(r.itens, function (key, item) {
      if (!$('#WA' + item.id).length) {
        printRecord(item);
      }
    });

    if (pendingCards.length == doneCards.length) {
      $('.wa-loading-records').hide();
    }

    loading = false;
  });
  page++;
}

function ClearAllItems() {
  $('#wa-record-grid').isotope('remove', $('#wa-record-grid').isotope('getItemElements'));
  page = 1;
  pendingCards = [];
  doneCards = [];
  nextCard = 0;
  loading = false;
}

$(document).ready(function () {
  isMobile = $(window).width() <= 700;

  $(window).on('popstate', function () {
    if ($('#wa-detalhes').attr('display') != 'none') {
      $('#wa-detalhes').modal('hide');
      $('#wa-detalhes .modal-body').empty();
    }
  });

  /*var isSmallDevice = isMobile && window.devicePixelRatio < 3;*/

  var isoParam = {
    itemSelector: '.wa-grid-item',
    masonry: {
      columnWidth: 320,
    },
    /*layoutMode: (isSmallDevice ?'masonry':'fitRows'),	*/
    layoutMode: isMobile ? 'masonry' : 'fitRows',
    transitionDuration: '0.4s',
  };

  iso = $('.wa-record-grid').isotope(isoParam);

  $('#wa-detalhes').on('hidden.bs.modal', function () {
    history.pushState(null, null, current_page_url);
    if ($ajaxLoader != null) {
      $ajaxLoader.abort();
      $ajaxLoader = null;
    }
    $('.wa-nav-spinner').hide();
    $('.wa-nav-next, .wa-nav-prev, .protectedImage').remove();

    removeSwipeListener();
    $('audio').each(function () {
      $(this)[0].pause();
    });

    //var $gi = $('.m-grid__item');
    //var offset = $gi.offset();
    //offset.top = $(".m-grid").attr('scroll-position');
    //alert(offset.top );
    //$gi.offset(offset);
    //$(".m-grid").css("overflow", "visible");
  });

  $('.wa-record-grid img').one('load', function () {
    $('.wa-record-grid').isotope('layout');
  });

  $('.m-grid').on('touchmove', function () {
    if (($('element').data('bs.modal') || {})._isShown) {
      alert(2);
      return false;
    } else {
      alert(1);
      return true;
    }
  });

  $(document).keydown(function (e) {
    switch (e.which) {
      case 37: // left
        if (!$('.form-control.m-input').is(':focus')) {
          e.preventDefault();
          goPrevious();
        }
        break;

      case 38: // up
        break;

      case 39: // right
        if (!$('.form-control.m-input').is(':focus')) {
          e.preventDefault();
          goNext();
        }
        break;

      case 40: // down
        break;

      default:
        return; // exit this handler for other keys
    }
  });

  $('#wa-detalhes .modal-content').click(function (e) {
    var target = $(e.target);
    if (target.hasClass('m-content') || target.hasClass('wa-record-container')) {
      if ($('#wa-detalhes').attr('display') != 'none') {
        $('#wa-detalhes').modal('hide');
        $('#wa-detalhes .modal-body').empty();
      }
    }
  });

  // SimpleInfiniteScroll
  function Infinite(e) {
    if (e.type == 'scroll' || e.type == 'click') {
      var doc = document.documentElement;
      var top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
      var bottom = top + $(window).height();
      var docBottom = $(document).height();

      if (bottom + 100 >= docBottom) {
        LoadItems();
      }
    }

    var scroll = $(window).scrollTop();
    var desceu = prevScrollPos < scroll;
    if (!isMobile) {
      if (scroll >= 800 && desceu) {
        $('body').removeClass('m-header--show').addClass('m-header--hide');
      } else {
        $('body').removeClass('m-header--hide').addClass('m-header--show');
      }
    }
    prevScrollPos = scroll;
  }

  $(window).scroll(Infinite);

  startLoadingRecords();
});
