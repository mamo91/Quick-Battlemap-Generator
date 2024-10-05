async function main() {

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

    // for (let x = 0; x < grid.length; x++) {
    //   for (let y = 0; y < grid[x].length; y++) {
    for (let tile of grid) {
        let closestCategory = null;
        let minDistance = Infinity;
        let closestPoints = [];

        for (const tName of terrainNames) {
          let category = terrains[tName];
          for (const point of category.points) {
            const dx = point[0] - tile.x;
            const dy = point[1] - tile.y;
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

        tile.terrain = averageCategoryDistances[0][0];
        tile.calculatedDistances = averageCategoryDistances;
        tile.closestPoints = closestPoints;
      // }
    }
    return grid;
  }

  //initializes the grid, mainly the points
  function initializeGrid(sceneRect, gridScale, sceneRect) {
    //Initialize the grid to all void
    let map = new Array(Math.ceil(sceneRect.width/gridScale));
    map.scale = gridScale;
    for (let i = 0; i < Math.ceil(sceneRect.width/gridScale); i += 1) {
      map[i] = new Array(Math.ceil(sceneRect.height/gridScale));
      for (let j = 0; j < Math.ceil(sceneRect.height/gridScale); j += 1) {
        map[i][j] = {
          x: sceneRect.x+(i*gridScale), 
          y: sceneRect.y+(j*gridScale), 
          xIndex: i,
          yIndex: j,
          terrain: "void",
          decorations: []
        };
      }
    }
    map.get = (x, y) => {
      if (x < map.length && x >= 0 && y < map[0].length && y >= 0 ) {
        return map[x][y];
      } else if (x >= 0 && y < map[0].length && y >= 0 ) {
        return map[map.length-1][y];
      } else if (x < map.length && y < map[0].length && y >= 0 ) {
        return map[0][y];
      } else if (x < map.length && x >= 0 && y >= 0 ) {
        return map[x][map[0].length-1];
      } else if (x < map.length && x >= 0 && y < map[0].length) {
        return map[x][0];
      } else {
        return {x: -1, y: -1, terrain: 'any', decorations: []};
      }
    }
    map[Symbol.iterator] = function* () {
      for (let x = 0; x < map.length; x++) {
        for (let y = 0; y < map[x].length; y++) {
          yield map[x][y];
        }
      }
    };
    return map;
  }

  // Categorize drawings by color and add their points to the corresponding terrains
  function processDrawings(terrains) {
    let d = canvas.drawings.children[0]; //<- all drawings
    for (let i = 0; i < d.children.length; i += 1) {
      let points = convertRelativePointsToGlobal([d.children[i].shape.data.x, d.children[i].shape.data.y], d.children[i].shape.data.shape.points);
      let globalPoints = points.map(point => canvas.grid.getTopLeft(point[0], point[1] ));
      let drawingTerrain = terrainFromColor(d.children[i].document.strokeColor);
      // console.log(drawingTerrain);
      terrains[drawingTerrain].points.push(...globalPoints);
    }
  }
  // TODO: Add some intermediate points if the bezier points are too far apart

  // create tiles based on the map
  function createTiles(map) {
    let newTiles = [];
    for (let tile of grid) {
        let newTile = {};
        newTile.x = tile.x;
        newTile.y = tile.y;
        newTile.texture = {};
        newTile.texture.src = moduleDirectory + "images/tiles/" + tile.texture;
        newTile.width = map.scale;
        newTile.height = map.scale;
        newTile.zIndex = 100;
        newTiles.push(newTile);

        let decorationZIndex = 101;
        for (decoration of tile.decorations) {
          let newTile = {};
          newTile.x = tile.x;
          newTile.y = tile.y;
          newTile.texture = {};
          newTile.texture.src = moduleDirectory + "images/decorations/" + decoration.texture[Math.floor(Math.random() * decoration.texture.length)];
          newTile.width = map.scale * decoration.width;
          newTile.height = map.scale * decoration.height;
          newTile.zIndex = decorationZIndex;
          newTiles.push(newTile);
          decorationZIndex += 1;
        }
    }
    return newTiles;
  }

  //fuzzily compares terrains based on the terrainComparisonMap
  function compareTerrainNames(terrain1, terrain2) {
    if (typeof(terrain1) != 'string') {
      terrain1 = terrain1.terrain;
    }
    if (typeof(terrain2) != 'string') {
      terrain2 = terrain2.terrain;
    }
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
      let c = !compareTerrainNames(neighbors1[i], neighbors2[i]);
      if (c) {
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
    // for (var x = grid.length - 1; x >= 0; x--) {
    //   for (var y = grid[x].length - 1; y >= 0; y--) {
    for (let tile of grid) {
        // let tile = grid[x][y];
        let neighbors = getRegion(grid, tile.xIndex-1, tile.yIndex-1, 3, 3);
        neighbors.splice(4, 1);
          // grid.get(x-1, y-1).terrain, grid.get(x, y-1).terrain, grid.get(x+1, y-1).terrain, 
          // grid.get(x-1, y).terrain,                         grid.get(x+1, y).terrain, 
          // grid.get(x-1, y+1).terrain, grid.get(x, y+1).terrain, grid.get(x+1, y+1).terrain];
        tile.texture = selectTexture(tile.terrain, neighbors);
        if (tile.texture === undefined) {
          console.log(tile.terrain, neighbors);
        }
      // }
    }
    return grid; //unneeded
  }

  //Given a terrain type and an array of the neighbors, give the texture for that square
  function selectTexture(tile, neighbors) {
    for (let match of terrains[tile].textures) {
      if (match[0] != 'default' && compareNeighbors( match[0], neighbors)) {
        // if (!terrains[tile.terrain]) {
        //   console.log(tile);
        // }
        return match[1];
        // return match[0];
      }
    }
    return terrains[tile].textures[0][1];
  }

  // Neighbors in form matching: [north-west, north, north-east, east, west, south-west, south, south-east]

  // function initializeTerrains(moduleDirectory) {
  //   const terrains = await fetchJsonWithTimeout("/modules/Quick-Battlemap-Generator/scripts/decorations.json")

  //   return terrains;
  // }

  function decorate() {
    let decorationResults = {
      filler: [],
      noticeable: [],
      interactive: [],
      walls: [],
      zones: []
    }
    addFillerDecorations();
    addNoticeableDecorations();
    addInteractiveDecorations();
    addWalls();
    addZones();
  }
  function addFillerDecorations() {
    // for (var x = grid.length - 1; x >= 0; x--) {
    //   for (var y = grid[x].length - 1; y >= 0; y--) {
    for (let tile of grid) {
        // let tile = grid[x][y];
        let neighbors = getRegion(grid, tile.xIndex-1, tile.yIndex-1, 3, 3);
        // reduce decorations to only ones that satisfy the rule
        let matchingDecorations = decorations.filter((decoration) => compareNeighbors( decoration.rule, neighbors));
        // if (tile.terrain == 'water' && mat) {

        // console.log(decorations);
        // }
        // pick a random number

        let choice = Math.random();
        // for each in the list of decorations, compare to frequency
        for (decoration of matchingDecorations) {
          if (choice < decoration.frequency) { //maybe add some check about the total being too high? Naaah
            // if less select that decoration
            choice = decoration;
            break;
          } else {
            // if more, subtract frequency and try the next one
            choice -= decoration.frequency;
          }
        }
        // if no more decorations, leave blank.
        if (typeof(choice) === 'object') {
          tile.decorations.push(choice);
        }
      // }
    }
  }
  // uses .get to retrieve the elements of a region of a 2d grid in reading order (left to right, then top to bottom).
  //x, y, top left point, width, height, self explanatory.
  function getRegion(grid, x, y, width, height) {
    let region = [];
    for (var i = 0; i < height; i++) { //x=j, y=i to get reading order
      for (var j = 0; j < width; j++) {
        region.push(grid.get(x+j, y+i));
      }
    }
    return region;
  }
  function addNoticeableDecorations() {
    // body...
  }
  function addInteractiveDecorations() {
    // body...
  }
  function addWalls() {
    // body...
  }
  function addZones() {
    // body...
  }




  let gridScale = canvas.scene.grid.size;
  let sceneRect = canvas.scene.dimensions.sceneRect;
  let moduleDirectory = "modules/quick-battlemap-generator/";

  //Initialize the grid to all void
  let grid = initializeGrid(sceneRect, gridScale, sceneRect);
  // let terrains = initializeTerrains(moduleDirectory);
  const terrains = await fetchJsonWithTimeout("/modules/quick-battlemap-generator/scripts/terrains.json");
  const decorations = (await fetchJsonWithTimeout("/modules/quick-battlemap-generator/scripts/decorations.json")).decorations;
  const terrainNames = Object.keys(terrains);
  let terrainComparisonMap = initializeTerrainComparisonMap();

  processDrawings(terrains);
  categorizePoints(grid, terrains);
  autotile(grid);
  decorate();
  newTiles = createTiles(grid);


  let promise = canvas.scene.createEmbeddedDocuments("Tile", newTiles);
  return { grid, terrains, terrainNames, terrainComparisonMap, newTiles, promise };
}
let result = main();
result

//TODO: Apparently also create an entire color-picking module for the drawing tool? Or recommend the boneyard one.
// game.settings.settings.get("core.defaultDrawingConfig");

//TODO: Fix edge autotiling.
//TODO: Add stone path interior corner custom logic?
//TODO: Add sugar (cobbles, trees, bushes, grass patterns, wave patterns)
//TODO: Add interface:
  //TODO: Create dialogue
  //TODO: 
  //TODO: Add color picker for drawing with key to terrains