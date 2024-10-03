function main() {

  let gridScale = canvas.scene.grid.size;
  let sceneRect = canvas.scene.dimensions.sceneRect;
  let moduleDirectory = "modules/MapMaker/";


  function convertRelativePointsToGlobal(anchorPoint, relativePoints) {
    const globalPoints = [];
    const anchorX = anchorPoint[0];
    const anchorY = anchorPoint[1];

    for (let i = 0; i < relativePoints.length; i += 2) {
      const x0 = relativePoints[i] + anchorX;
      const y0 = relativePoints[i + 1] + anchorY;
      globalPoints.push([x0, y0]);
    }

    return globalPoints;
  }

  function colorSimilarity(color1, color2) {
    // Convert hex strings to RGB components
    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3],  
   16)
      ] : null;
    }

    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    // Calculate Euclidean distance between RGB values
    const dr = rgb1[0] - rgb2[0];
    const dg = rgb1[1] - rgb2[1];
    const db = rgb1[2] - rgb2[2];
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    // Normalize distance to a value between 0 and 1
    const maxDistance = Math.sqrt(255 * 255 * 3);
    const normalizedDistance = distance / maxDistance;

    // Return similarity score (1 - normalized distance)
    return 1 - normalizedDistance;
  }

  function terrainFromColor(color) {
    return terrainNames.toSorted((a, b) => colorSimilarity(color, terrains[b].color) - colorSimilarity(color, terrains[a].color))[0];
  }

  //categorizes grid points by the nearest drawing points
  function categorizePoints(grid, categories) {
    const categorizedGrid = new Array(grid.length);
    for (let i = 0; i < grid.length; i++) {
      categorizedGrid[i] = new Array(grid[i].length);
    }

    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        let closestCategory = null;
        let minDistance = Infinity;
        let closestPoints = [];

        for (const tName of terrainNames) {
          let category = terrains[tName];
          for (const point of category.points) {
            const dx = point[0] - grid[x][y].x;
            const dy = point[1] - grid[x][y].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (closestPoints.length < 1) {
              closestPoints.push({ x: point[0], y: point[1], distance, category }); 
              closestPoints.sort((a, b) => a.distance - b.distance);
            } else {
              const maxDistance = closestPoints[closestPoints.length - 1].distance;
              if (distance < maxDistance) {
                for (let i = 0; i < closestPoints.length; i++) {
                  if (closestPoints[i].distance > distance) {
                    closestPoints.splice(i, 1, { x: point[0], y: point[1], distance, category });
                    break;
                  }
                }
              }
            }
          }
        }

        let averageCategoryDistances = [];
        for (name of terrainNames) {
          let categoryPoints = closestPoints.filter((point) => point.category.name == name);

          let averageDistance = Infinity;
          if (categoryPoints.length != 0) {
            averageDistance = categoryPoints.reduce((sum, point) => sum + point.distance * point.distance, 0) / categoryPoints.length;
          }
          averageCategoryDistances.push([name, averageDistance]);
        }
        averageCategoryDistances.sort((a, b) => a[1]-b[1]);

        grid[x][y].terrain = averageCategoryDistances[0][0];
        grid[x][y].calculatedDistances = averageCategoryDistances;
        grid[x][y].closestPoints = closestPoints;
      }
    }
    return grid;
  }

  //initializes the grid, mainly the points
  function initializeGrid(sceneRect, gridScale, sceneRect) {
    //Initialize the grid to all void
    let map = new Array(Math.ceil(sceneRect.width/gridScale));
    for (let i = 0; i < Math.ceil(sceneRect.width/gridScale); i += 1) {
      map[i] = new Array(Math.ceil(sceneRect.height/gridScale));
      for (let j = 0; j < Math.ceil(sceneRect.height/gridScale); j += 1) {
        map[i][j] = {
          x: sceneRect.x+(i*gridScale), 
          y: sceneRect.y+(j*gridScale), 
          terrain: "void"
        };
      }
    }
    map.get = (x, y) => {
      if (x < map.length && x >= 0 && y < map[0].length && y >= 0 ) {
        return map[x][y];
      } else {
        return {x: -1, y: -1, terrain: 'any'};
      }
    }
    return map;
  }

  // Categorize drawings by color and add their points to the corresponding terrains
  function processDrawings(terrains) {
    let d = canvas.drawings.children[0]; //<- all drawings
    for (let i = 0; i < d.children.length; i += 1) {
      let points = convertRelativePointsToGlobal([d.children[i].shape.data.x, d.children[i].shape.data.y], d.children[i].shape.data.shape.points);
      let globalPoints = points.map(point => canvas.grid.getTopLeft(point[0], point[1] ));
      let drawingTerrain = terrainFromColor(d.children[i].document.strokeColor);
      // console.log(drawingTerrain.color + " from " + d.children[i].document.strokeColor)
      console.log(drawingTerrain);
      terrains[drawingTerrain].points.push(...globalPoints);
    }
  }
  // TODO: Add some intermediate points if the bezier points are too far apart

  // create tiles based on the map
  function createTiles(map, terrains, gridScale) {
    let newTiles = [];
    for (let x = 0; x < map.length; x++) {
      for (let y = 0; y < map[x].length; y++) {
        let newTile = {};
        newTile.x = map[x][y].x;
        newTile.y = map[x][y].y;
        newTile.texture = {};
        newTile.texture.src = map[x][y].texture;
        // newTile.texture.tint = "#690069";
        newTile.width = gridScale;
        newTile.height = gridScale;
        newTiles.push(newTile);
      }
    }
    return newTiles;
  }






  //fuzzily compares terrains based on the terrainComparisonMap
  function compareTerrainNames(terrain1, terrain2) {
    // console.log(terrain1, terrain2);
    if (terrainComparisonMap.has(terrain1)) {
      return terrainComparisonMap.get(terrain1).includes(terrain2);
    }
    if (terrainComparisonMap.has(terrain2)) {
      return terrainComparisonMap.get(terrain2).includes(terrain1);
    }
    return terrain1 == terrain2;
  }

  //returns whether two arrays of terrains contain fuzzily the same terrains
  function compareNeighbors(neighbors1, neighbors2) {
    let ret = true;
    for (var i = neighbors1.length - 1; i >= 0; i--) {
      if (!compareTerrainNames(neighbors1[i], neighbors2[i])) {
        return false;
      }
    }
    return true;
  }

  function initializeTerrainComparisonMap() {
    let terrainComparisonMap = new Map();
    terrainComparisonMap.set('any', terrainNames.slice());
    terrainComparisonMap.set('land', ['grass', 'road']);
    for (terrain of terrainNames) {
      terrainComparisonMap.set('non-'+terrain, terrainNames.toSpliced(terrainNames.indexOf(terrain), 1));

    }
    return terrainComparisonMap;
  }

  // add the appropriate textures to the grid based on corners.
  function autotile(grid) {
    for (var x = grid.length - 1; x >= 0; x--) {
      for (var y = grid[x].length - 1; y >= 0; y--) {
        let tile = grid[x][y];
        let neighbors = [
          grid.get(x-1, y-1).terrain, grid.get(x, y-1).terrain, grid.get(x+1, y-1).terrain, 
          grid.get(x-1, y).terrain,                         grid.get(x+1, y).terrain, 
          grid.get(x-1, y+1).terrain, grid.get(x, y+1).terrain, grid.get(x+1, y+1).terrain];
        tile.texture = selectTexture(tile.terrain, neighbors);
        if (tile.texture === undefined) {
          console.log(tile.terrain, neighbors);
        }
      }
    }
    return grid; //unneeded
  }

  //Given a terrain type and an array of the neighbors, give the texture for that square
  function selectTexture(tile, neighbors) {
    for (let match of terrains[tile].textures) {
      if (match[0] != 'default' && compareNeighbors( match[0], neighbors)) {
        return terrains[tile].textures.get(match[0]);
        // return match[0];
      }
    }
    return terrains[tile].textures.get('default')
  }

  // Neighbors in form matching: [north-west, north, north-east, east, west, south-west, south, south-east]

  function initializeTerrains(moduleDirectory) {
    const terrains = {
      water: {
        color: "#0000FF",
        name: "water",
        textures: new Map(),
        points: [],
      },
      grass: {
        color: "#00FF00",
        name: "grass",
        textures: new Map(),
        points: []
      },
      road: {
        color: "#A0522D",
        name: "road",
        textures: new Map(),
        points: []
      },
      void: {
        color: "#000000",
        name: "void",
        textures: new Map(),
        points: []
      }
    };
    terrains.water.textures.set('default', moduleDirectory+'tiles/'+'Water_tile.png');
    terrains.grass.textures.set('default', moduleDirectory+'tiles/'+'Grass_tile.png');
    terrains.road.textures.set( 'default', moduleDirectory+'tiles/'+'Roads_stone_tile.png');
    terrains.grass.textures.set([
      'land', 'land', 'land', 
      'land',         'land', 
      'land', 'land', 'land'], moduleDirectory+"tiles/"+"Grass_tile.png");
    terrains.grass.textures.set([
      'any',  'water', 'any', 
      'water',         'land', 
      'any',   'land', 'land'], moduleDirectory+"tiles/"+"Water_coast_1.png");
    terrains.grass.textures.set([
      'any',   'water', 'any', 
      'land',          'land', 
      'any',   'land', 'any'], moduleDirectory+"tiles/"+"Water_coast_2.png");
    terrains.grass.textures.set([
      'any',   'water', 'any', 
      'land',          'water', 
      'land', 'land', 'any'], moduleDirectory+"tiles/"+"Water_coast_3.png");
    terrains.grass.textures.set([
      'any',   'land', 'any', 
      'water',          'land', 
      'any',   'land', 'any'], moduleDirectory+"tiles/"+"Water_coast_4.png");
    terrains.grass.textures.set([
      'any',   'land', 'any', 
      'land',          'water', 
      'any',   'land', 'any'], moduleDirectory+"tiles/"+"Water_coast_5.png");
    terrains.grass.textures.set([
      'any',   'land', 'land', 
      'water',          'land', 
      'any',   'water', 'any'], moduleDirectory+"tiles/"+"Water_coast_6.png");
    terrains.grass.textures.set([
      'any',   'land', 'any', 
      'land',          'land', 
      'any',   'water', 'any'], moduleDirectory+"tiles/"+"Water_coast_7.png");
    terrains.grass.textures.set([
      'land', 'land', 'any', 
      'land',          'water', 
      'any',   'water', 'any'], moduleDirectory+"tiles/"+"Water_coast_8.png");
    terrains.grass.textures.set([
      'land', 'land', 'land', 
      'land',          'land', 
      'land', 'land', 'water'], moduleDirectory+"tiles/"+"Water_coast_9.png");
    terrains.grass.textures.set([
      'land', 'land', 'land', 
      'land',          'land', 
      'water', 'land', 'land'], moduleDirectory+"tiles/"+"Water_coast_10.png");
    terrains.grass.textures.set([
      'land', 'land', 'water', 
      'land',          'land', 
      'land', 'land', 'land'], moduleDirectory+"tiles/"+"Water_coast_11.png");
    terrains.grass.textures.set([
      'water', 'land', 'land', 
      'land',          'land', 
      'land', 'land', 'land'], moduleDirectory+"tiles/"+"Water_coast_12.png");
    terrains.road.textures.set([
      'road', 'road', 'road', 
      'road',         'road', 
      'road', 'road', 'road'], moduleDirectory+"tiles/"+"Roads_stone_tile.png");
    terrains.road.textures.set([
      'any', 'non-road', 'any', 
      'non-road',         'road', 
      'any', 'road', 'road'], moduleDirectory+"tiles/"+"Roads_stone_1.png");
    terrains.road.textures.set([
      'any', 'non-road', 'any', 
      'road',         'road', 
      'any', 'road', 'any'], moduleDirectory+"tiles/"+"Roads_stone_2.png");
    terrains.road.textures.set([
      'any', 'non-road', 'any', 
      'road',         'non-road', 
      'any', 'road', 'any'], moduleDirectory+"tiles/"+"Roads_stone_3.png");
    terrains.road.textures.set([
      'any', 'road', 'any', 
      'non-road',         'road', 
      'any', 'road', 'any'], moduleDirectory+"tiles/"+"Roads_stone_4.png");
    terrains.road.textures.set([
      'any', 'road', 'any', 
      'road',         'non-road', 
      'any', 'road', 'any'], moduleDirectory+"tiles/"+"Roads_stone_5.png");
    terrains.road.textures.set([
      'any', 'road', 'any', 
      'non-road',         'road', 
      'any', 'non-road', 'any'], moduleDirectory+"tiles/"+"Roads_stone_6.png");
    terrains.road.textures.set([
      'any', 'road', 'any', 
      'road',         'road', 
      'any', 'non-road', 'any'], moduleDirectory+"tiles/"+"Roads_stone_7.png");
    terrains.road.textures.set([
      'any', 'road', 'any', 
      'road',         'non-road', 
      'any', 'non-road', 'any'], moduleDirectory+"tiles/"+"Roads_stone_8.png");
    terrains.road.textures.set([
      'any', 'non-road', 'any', 
      'non-road',         'road', 
      'any', 'non-road', 'any'], moduleDirectory+"tiles/"+"Roads_stone_9.png");
    terrains.road.textures.set([
      'any', 'non-road', 'any', 
      'road',         'road', 
      'any', 'non-road', 'any'], moduleDirectory+"tiles/"+"Roads_stone_10.png");
    terrains.road.textures.set([
      'road', 'non-road', 'road', 
      'road',         'non-road', 
      'road', 'non-road', 'road'], moduleDirectory+"tiles/"+"Roads_stone_11.png");
    terrains.road.textures.set([
      'road', 'non-road', 'road', 
      'non-road',         'non-road', 
      'road', 'road', 'road'], moduleDirectory+"tiles/"+"Roads_stone_12.png");
    terrains.road.textures.set([
      'road', 'road', 'road', 
      'non-road',         'non-road', 
      'road', 'road', 'road'], moduleDirectory+"tiles/"+"Roads_stone_13.png");
    terrains.road.textures.set([
      'road', 'road', 'road', 
      'non-road',         'non-road', 
      'road', 'non-road', 'road'], moduleDirectory+"tiles/"+"Roads_stone_14.png");
    terrains.road.textures.set([
      'non-road', 'road', 'road', 
      'road',         'road', 
      'road', 'road', 'road'], moduleDirectory+"tiles/"+"Roads_stone_15.png");
    terrains.road.textures.set([
      'road', 'road', 'non-road', 
      'road',         'road', 
      'road', 'road', 'road'], moduleDirectory+"tiles/"+"Roads_stone_16.png");
    terrains.road.textures.set([
      'road', 'road', 'road', 
      'road',         'road', 
      'non-road', 'road', 'road'], moduleDirectory+"tiles/"+"Roads_stone_17.png");
    terrains.road.textures.set([
      'road', 'road', 'road', 
      'road',         'road', 
      'road', 'road', 'non-road'], moduleDirectory+"tiles/"+"Roads_stone_18.png");
    return terrains;
  }



  //Initialize the grid to all void
  let grid = initializeGrid(sceneRect, gridScale, sceneRect);
  let terrains = initializeTerrains(moduleDirectory);
  const terrainNames = Object.keys(terrains);
  let terrainComparisonMap = initializeTerrainComparisonMap();
  processDrawings(terrains);
  categorizePoints(grid, terrains);
  autotile(grid);
  newTiles = createTiles(grid, terrains, gridScale);
  let promise = canvas.scene.createEmbeddedDocuments("Tile",newTiles);
  return { grid, terrains, terrainNames, terrainComparisonMap, newTiles, promise };
}
let result = main();
result

//TODO: Apparently also create an entire color-picking module for the drawing tool? Or recommend the boneyard one.
// game.settings.settings.get("core.defaultDrawingConfig");